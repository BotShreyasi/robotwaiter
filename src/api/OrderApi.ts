// src/api/OrderApi.ts

import { PaymentData, OrderMap } from '../types';

const ROBOSERVER_IP = '98.70.32.248:5050'; //'74.225.236.63:5050'; // या roboserverip वेरिएबल से लें

// Helper function to format item names (from your component)
const formatItemName = (str: string) => {
    return str
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
};

export async function saveOrderApi(control: any, dish_mappings: any, order: OrderMap): Promise<void> {
    // Save order logic is very complex, so we'll simplify and use the main points:
    const orderEntries = Object.entries(order);

    if (orderEntries.length === 0) {
        console.log("[INFO] Skipping saveOrder: No items in order.");
        return;
    }
    const dish_mapping = control?.dish_mapping || {};
    const table_number = control?.payment_data?.table_number || 'PDR1';
    const customer = control?.customer || {};
    const special_notes = control?.special_notes || {};
    const order_info = control?.order_info || {};

    const now = new Date();
    const preorder_date = now.toISOString().split('T')[0];
    const preorder_time = now.toTimeString().split(' ')[0];

    // Calculate total amount from payment data if available, otherwise from order map
    const total_amount = Number(control?.payment_data?.total_amount) || orderEntries.reduce((sum, [, val]) => sum + val, 0);

    const itemsArray = orderEntries
        .map(([key, totalPrice]) => {
            const match = key.match(/^(.*?)\((\d+)\)$/);
            if (match) {
                const itemName = match[1];
                const quantity = parseInt(match[2], 10);
                const unitPrice = totalPrice / quantity;
                const note = special_notes[itemName] || '';
                return {
                    name: itemName,
                    quantity,
                    price: unitPrice,
                    discount: 0,
                    tax: 0,
                    notes: note,
                };
            }
            return null;
        })
        .filter(Boolean);
    // debugger;
    const saveOrderPayload = {
        table_number,
        dish_mapping,
        customer: {
            name: customer?.name || 'Guest',
            phone: customer?.phone || '',
            email: customer?.email || '',
            address: customer?.address || '',
            latitude: customer?.latitude || '',
            longitude: customer?.longitude || '',
        },
        items: itemsArray,
        total_amount: Number(total_amount) || 0,
        discount: order_info?.discount_total || 0,
        tax: order_info?.tax_total || 0,
        order_info: {
            preorder_date,
            preorder_time,
            service_charge: control?.payment_data?.robot_charge || 0,
            sc_tax_amount: order_info?.sc_tax_amount || 0,
            // ... (other order_info fields)
            order_type: order_info?.order_type || 'D',
            payment_type: order_info?.payment_type || 'UPI',
            total: Number(total_amount) || 0,
            table_no: table_number,
            discount_total: order_info?.discount_total || 0,
            tax_total: control?.payment_data?.gst_total || 0,
            collect_cash: Number(control?.payment_data?.amount || control?.payment_data?.total_amount) || 0,
        },
    };

    console.log('[INFO] Final save_order payload:', saveOrderPayload);
    // debugger;
    const res = await fetch(`http://${ROBOSERVER_IP}/chatbot/save_order/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveOrderPayload),
    });
// debugger;
    if (!res.ok) {
        throw new Error('Save order API failed');
    }
    console.log('[DEBUG] Save order response:', await res.json());
}

export async function startPaymentApi(control: any, order: OrderMap): Promise<{ paymentData: PaymentData; html: string; billHtml: string }> {
    const orderEntries = Object.entries(order);
    const table_number = control?.payment_data?.table_number || 'PDR1';
    const total_amount = Number(control?.payment_data?.total_amount) || orderEntries.reduce((sum, [, val]) => sum + val, 0);
    const total_price_in_paise = Math.round(total_amount * 100);
    // debugger;
    const startPaymentPayload = {
        amount: total_price_in_paise,
        currency: 'INR',
        mobile_no: '+918628948475',
        order_summary: order,
        table_number,
    };

    const res = await fetch(`http://${ROBOSERVER_IP}/chatbot/start_payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(startPaymentPayload),
    });
    // debugger;

    if (!res.ok) {
        throw new Error(`Start payment API failed: ${res.status}`);
    }
    // debugger;

    const paymentRes = await res.json();
    console.log('[DEBUG] Start Payment Response:', paymentRes);

    const paymentData: PaymentData = {
        key: paymentRes.key,
        amount: paymentRes.amount,
        currency: paymentRes.currency,
        table_number: paymentRes.table_number,
        order_id: paymentRes.order_id,
        payment_time: paymentRes.payment_time,
        robot_charge: paymentRes.robot_charge,
        sub_total: paymentRes.sub_total,
        gst_total: paymentRes.gst_total,
        gst_number: paymentRes.gst_number,
        total_amount: paymentRes.total_amount,
        bill_html: paymentRes.order_rows_html, // This will be the RAW HTML part
        upi_string: paymentRes.upi_string,
    };

    // Return QR HTML so the client WebView can open the Razorpay checkout (QR method)
    const qrHtml = generateQRHtml(paymentData);
    const billHtml = generateBillHTML(paymentData, order);

    return { paymentData, html: qrHtml, billHtml };
}

export async function paymentSuccessApi(payment_response: any, paymentData: PaymentData): Promise<void> {
    const res = await fetch(`http://${ROBOSERVER_IP}/chatbot/payment_success/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            payment_response,
            bill_html: paymentData.bill_html,
        }),
    });

    if (!res.ok) {
        throw new Error('Failed to notify backend about payment success');
    }
}


// --- HTML Generator Helpers (Put these in a separate helper file) ---
// Since the original component defined these functions internally, I'm including them
// here as a placeholder. In a real project, put them in a utility file.

const generateBillHTML = (paymentData: PaymentData, orderData: OrderMap): string => {
    const {
        gst_number,
        table_number,
        payment_time,
        robot_charge,
        sub_total,
        gst_total,
        total_amount,
    } = paymentData;

    const dynamicOrderRows = Object.entries(orderData)
        .map(([item, price]) => `<tr><td>${formatItemName(item)}</td><td>₹${price}</td></tr>`)
        .join('');

    // NOTE: I removed the `isTablet` variable logic here for simplicity, 
    // but you should pass device dimensions/flags if needed for the WebView styles.
    const isTablet = false;

    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          /* ... (Your original CSS styles for the bill) ... */
          body { margin: 0; font-family: 'Arial', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #000; }
          .bill { border-radius: 12px; padding: 20px; box-shadow: 0 0 10px rgba(0, 234, 255, 0.5); max-width: 700px; width: 100%; margin: auto; border: 1px solid #00eaff; }
          h2 { text-align: center; font-size: 28px; margin-bottom: 10px; font-weight: bold; color: #00eaff; text-shadow: 0 0 8px rgba(0, 234, 255, 0.7); }
          p { margin: 6px 0; font-size: 16px; font-weight: 600; color: #fff; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { padding: 10px; text-align: left; font-size: 16px; border-bottom: 1px solid rgba(0, 234, 255, 0.3); color: #fff; }
          th { background: #2c2c2e; font-weight: bold; color: #00eaff; }
          .total-row td { font-size: 18px; font-weight: bold; color: #00eaff; }
        </style>
      </head>
      <body>
        <div style="display:flex; justify-content:center; width:100%; height:100vh; padding:20px; box-sizing:border-box;">
        <div class="bill">
          <h2>The Robot Restaurant</h2>
          <p><strong>GST No:</strong> ${gst_number}</p>
          <p><strong>Table No:</strong> ${table_number}</p>
          <p><strong>Payment Time:</strong> ${payment_time}</p>
          <table>
            <thead>
              <tr><th>Item</th><th>Price</th></tr>
            </thead>
            <tbody>
              ${dynamicOrderRows}
              <tr><td>Robot Charges</td><td>₹${robot_charge}</td></tr>
            </tbody>
            <tfoot>
              <tr><td>Subtotal</td><td>₹${sub_total}</td></tr>
              <tr><td>GST (5%)</td><td>₹${gst_total}</td></tr>
              <tr class="total-row"><td>Total</td><td>₹${total_amount}</td></tr>
            </tfoot>
          </table>
        </div>
        </div>
      </body>
    </html>
  `;
};

// export const generateQRHtml = (paymentData: PaymentData): string => {
//     // NOTE: I removed the `isTablet` variable logic here for simplicity.
//     const isTablet = false;

//     // Wrap Razorpay open in try/catch and post back errors to RN WebView so app doesn't crash silently.
//     return `
//     <html>
//       <head>
//         <meta charset="utf-8" />
//         <meta name="viewport" content="width=device-width,initial-scale=1" />
//         <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
//         <style>
//           body {
//             font-family: 'Arial', sans-serif;
//             background: #000;
//             display: flex;
//             flex-direction: column; /* Added for centering */
//             justify-content: center;
//             align-items: center;
//             height: 100vh;
//             margin: 0;
//             color: #00eaff;
//           }
//           h1 {
//             font-size: ${isTablet ? '36px' : '28px'};
//             text-align: center;
//             margin-bottom: 20px;
//             color: #00eaff;
//             text-shadow: 0 0 10px rgba(0, 234, 255, 0.7);
//           }
//           .fallback { color: #fff; margin-top: 20px; font-size: 16px; }
//         </style>
//       </head>
//       <body>
//         <h1>Scan QR Code to Pay</h1>
//         <div id="status" class="fallback">Opening payment...</div>
//         <script>
//           function post(type, payload) {
//             try { window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, payload))); } catch(e) { console.warn('post error', e); }
//           }

//           // #region agent log
//           function sendAgentLog(message, data) {
//             fetch('http://127.0.0.1:7242/ingest/8598f0d8-a759-4ebe-b282-6ef49e1183b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'OrderApi.generateQRHtml',message:message,data:data,timestamp:Date.now()})}).catch(()=>{});
//           }
//           // #endregion

//           document.addEventListener('DOMContentLoaded', function() {
//             try {
//               var options = {
//                 key: "${paymentData.key}",
//                 amount: "${paymentData.amount}",
//                 currency: "${paymentData.currency}",
//                 name: "QR Code Payment",
//                 description: "Table #${paymentData.table_number}",
//                 order_id: "${paymentData.order_id}",
//                 method: { upi: { qr: true } },
//                 handler: function (response) {
//                   post('payment_done', { payment_response: {
//                     razorpay_payment_id: response.razorpay_payment_id,
//                     razorpay_order_id: response.razorpay_order_id,
//                     razorpay_signature: response.razorpay_signature
//                   }});
//                 },
//                 theme: { color: "#00eaff" }
//               };

//               // #region agent log
//               sendAgentLog('QR options prepared', {order_id: "${paymentData.order_id}", amount: "${paymentData.amount}", currency: "${paymentData.currency}", table_number: "${paymentData.table_number}"});
//               // #endregion

//               try {
//                 var rzp1 = new Razorpay(options);
//                 rzp1.open();
//                 document.getElementById('status').innerText = 'Please complete payment using the QR/checkout.';
//               } catch (openErr) {
//                 // #region agent log
//                 sendAgentLog('QR open error', {error: openErr && openErr.message ? openErr.message : 'unknown'});
//                 // #endregion
//                 post('payment_error', { error: openErr.message });
//                 document.getElementById('status').innerHTML = 'Unable to open checkout. Please use this UPI link:<br/><a style="color:#00eaff" href="${paymentData.upi_string || ''}">${paymentData.upi_string || 'UPI_LINK'}</a>';
//               }
//             } catch (err) {
//               // #region agent log
//               sendAgentLog('QR init error', {error: err && err.message ? err.message : 'unknown'});
//               // #endregion
//               post('payment_error', { error: err.message });
//               document.getElementById('status').innerText = 'Payment failed to start.';
//             }
//           });
//         </script>
//       </body>
//     </html>
//   `;
// };


export const generateQRHtml = (paymentData: PaymentData): string => 
  
`
    <html>
      <head>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <script>
          // Prevent popup crashes; forward to React Native for handling
          window.open = function(url) {
            try {
              window.ReactNativeWebView &&
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'open_url', url }));
            } catch (e) {}
            return null;
          };
        </script>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            background: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            color: #00eaff;
          }
          h1 {
            text-align: center;
            margin-bottom: 20px;
            color: #00eaff;
            text-shadow: 0 0 10px rgba(0, 234, 255, 0.7);
          }
        </style>
      </head>
      <body>
        <h1>Scan QR Code to Pay</h1>
        <script>
          var options = {
            key: "${paymentData.key}",
            amount: "${paymentData.amount}",
            currency: "${paymentData.currency}",
            name: "QR Code Payment",
            description: "Table #${paymentData.table_number}",
            order_id: "${paymentData.order_id}",
            method: { upi: { qr: true } },
            modal: {
              ondismiss: function () {
                window.ReactNativeWebView &&
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: "payment_closed" }));
              }
            },
            handler: function (response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: "payment_done",
                payment_response: {
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature
                }
              }));
            },
            // Capture failures explicitly
            config: {
              display: {
                blocks: {}
              }
            },
            theme: { color: "#00eaff" }
          };
          var rzp1 = new Razorpay(options);
          rzp1.on('payment.failed', function (response) {
            window.ReactNativeWebView &&
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: "payment_error",
                error: response && response.error ? response.error.description : "Payment failed"
              }));
          });
          rzp1.open();
        </script>
      </body>
    </html>
  `;