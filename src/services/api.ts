// src/services/api.ts
// RAGFlow + roboserver APIs (TS version of robotui/services/api.js)

import { RAGFLOW_BASE_URL, RAGFLOW_ACCESS_TOKEN, RAGFLOW_BOT_ID, RAZORPAY_KEY_ID } from '../config/Config';

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${RAGFLOW_ACCESS_TOKEN}`,
};

type Control = {
  disconnect: string;
  session_id: string;
  audio: string;
  slots: Record<string, unknown>;
  is_order: number;
  order: Record<string, number>;
  language: string;
  notes: string;
  show_menu: number;
  order_info?: any;
  customer?: any;
  special_notes?: Record<string, string>;
  dish_mapping?: any;
  payment_data?: any;
};

export type PaymentData = {
  key: string;
  amount: number;
  currency: string;
  table_number: string;
  order_id: string;
  payment_time: string;
  robot_charge: number;
  sub_total: number;
  gst_total: number;
  gst_number: string;
  total_amount: number;
  bill_html: string;
};

export type BotResponse = {
  response: string;
  control: Control;
  payment_data: PaymentData | null;
  dish_mapping: any;
};

export type StartSessionResult = {
  session_id: string;
  response: string;
  control: Control;
};

const safeParseJSON = (str: string): any => {
  try {
    let cleaned = str
      .replace(/::/g, ':')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/\\+"/g, '"')
      .replace(/[“”]/g, '"')
      .replace(/‘|’/g, "'")
      .replace(/&nbsp;/g, ' ');
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
};

export const startSession = async (): Promise<StartSessionResult> => {
  const currentDateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const payload = {
    question: '',
    current_datetime: currentDateTime,
  };

  const res = await fetch(
    `${RAGFLOW_BASE_URL}/api/v1/agentbots/${RAGFLOW_BOT_ID}/completions`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to start session: ${res.status} ${errText}`);
  }

  const text = await res.text();
  const lines = text.trim().split('\n');

  let sessionId = '';
  let finalAnswer = '';
  let control: Control = {
    disconnect: '0',
    session_id: '',
    audio: '',
    slots: {},
    is_order: 0,
    order: {},
    language: 'hi-IN-KavyaNeural',
    notes: '',
    show_menu: 0,
  };

  for (const rawLine of lines) {
    const line = rawLine.replace('data:', '').trim();
    if (!line) continue;

    try {
      const parsed = JSON.parse(line);
      if (parsed.data && parsed.data.session_id) {
        sessionId = parsed.data.session_id;
        let answer: string = parsed.data.answer || '';
        const jsonDelimiter = '\n\n{';
        let extracted: any = {};

        const jsonStart = answer.indexOf(jsonDelimiter);
        if (jsonStart !== -1) {
          const possibleJson = answer.slice(jsonStart + jsonDelimiter.length).trim();
          if (possibleJson.includes('{') && possibleJson.includes('}')) {
            const jsonStrMatch = possibleJson.match(/\{[\s\S]*\}/);
            if (jsonStrMatch) {
              extracted = safeParseJSON(jsonStrMatch[0]);
            }
          }
          answer = answer.slice(0, jsonStart).trim();
        }

        finalAnswer = answer.replace(/\n/g, ' ').trim();
        control = {
          audio: extracted.control?.audio || '',
          disconnect: String(extracted.control?.disconnect ?? extracted.disconnect ?? '0'),
          is_order: extracted.control?.is_order || 0,
          language: extracted.control?.language || 'hi-IN-KavyaNeural',
          notes: extracted.control?.notes || '',
          order: extracted.control?.order || {},
          order_info: extracted.control?.order_info || {},
          session_id: extracted.control?.session_id || sessionId,
          show_menu: extracted.control?.show_menu ?? extracted.show_menu ?? 0,
          slots: extracted.control?.slots || {},
          customer: extracted.customer || { name: '', phone: '', email: '' },
          special_notes: extracted.special_notes || {},
          dish_mapping: extracted.dish_mapping || {},
          payment_data: extracted.payment_data || null,
        };
      }
    } catch (e) {
      console.log('[startSession] parse line error', e);
    }
  }

  if (!sessionId) throw new Error('No session_id in startSession');
  return { session_id: sessionId, response: finalAnswer, control };
};





export const sendUserText = async (session_id: string,
  userText: string,) => {
  try {
    if (!session_id || !userText) {
      throw new Error(`[DEBUG] Invalid input: session_id=${session_id}, userText=${userText}`);
    }

    const payload = { question: userText, session_id };
    //   manoj comm...   console.log('[DEBUG] Sending payload to RAGFlow:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${RAGFLOW_BASE_URL}/api/v1/agentbots/${RAGFLOW_BOT_ID}/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    //   manoj comm...   console.log('[DEBUG] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      //   manoj comm...   console.log('[DEBUG] Error response body:', errorText);
      throw new Error(`Failed to send user text: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    //   manoj comm...   console.log('[DEBUG] Raw response text:', text);

    const lines = text.trim().split('\n');
    let finalAnswer = '';
    let control = {};
    let payment_data = null;
    let dish_mapping = {};
    console.log('lines', lines);

    for (const [i, line] of lines.entries()) {
      const jsonPart = line.replace('data:', '').trim();
      if (!jsonPart) continue;

      // console.log(`[DEBUG] Processing line ${i}:`, jsonPart);

      try {
        const parsed = JSON.parse(jsonPart);
        //   manoj comm...   //   manoj comm...   console.log('[DEBUG] Parsed JSON line:', parsed);

        if (parsed.data && parsed.data.answer) {
          let rawAnswer = parsed.data.answer;
          let extracted = {};

          // 🔹 Handle "__" or "___" JSON delimiter
          const jsonDelimiter = rawAnswer.includes('___') ? '___' : '__';
          const jsonStart = rawAnswer.indexOf(jsonDelimiter);

          if (jsonStart !== -1) {
            const possibleJson = rawAnswer.slice(jsonStart + jsonDelimiter.length).trim();

            // ✅ Only parse if full JSON present (has both braces)
            if (possibleJson.includes('{') && possibleJson.includes('}')) {
              const jsonStrMatch = possibleJson.match(/\{[\s\S]*\}/);
              if (jsonStrMatch) {
                // const jsonStr = jsonStrMatch[0]
                //   .replace(/'/g, '"')
                //   .replace(/[“”]/g, '"')
                //   .replace(/,\s*}/g, '}')
                //   .replace(/,\s*]/g, ']');
                const jsonStr = jsonStrMatch[0];
                extracted = safeParseJSON(jsonStr);

                // try {
                //   extracted = JSON.parse(jsonStr);
                // } catch (err) {
                //   //   manoj comm...   console.log('[DEBUG] JSON incomplete or invalid, skipping parse this round');
                // }
              }
            }

            // Remove JSON + marker to get clean text
            rawAnswer = rawAnswer.slice(0, jsonStart).trim();
            rawAnswer = rawAnswer
              .replace(/\*+/g, ' ')
              .replace(/&/g, ' ')      // remove &
              .replace(/’/g, "'")      // normalize apostrophe
              .replace(/\s{2,}/g, ' '); // collapse extra spaces
          }

          finalAnswer = rawAnswer;

          // 🔹 Build control object safely
          control = {
            audio: extracted.control?.audio || '',
            disconnect: String(extracted.control?.disconnect ?? extracted.disconnect ?? '0'),
            is_order: extracted.control?.is_order || 0,
            language: extracted.control?.language || 'hi-IN-KavyaNeural',
            notes: extracted.control?.notes || '',
            order: extracted.control?.order || {},
            order_info: extracted.control?.order_info || {},
            session_id: extracted.control?.session_id || parsed.data.session_id || session_id,
            // show_menu: extracted.control?.show_menu || 0,
            show_menu: extracted.control?.show_menu ?? extracted.show_menu ?? 0,
            slots: extracted.control?.slots || {},
            customer: extracted.customer || { name: '', phone: '', email: '' },
            special_notes: extracted.special_notes || {},
            dish_mapping: extracted.control?.dish_mapping || {}
          };
          // //   manoj comm...   console.log('[DEBUG] Control object:', control);
          dish_mapping: extracted.control?.dish_mapping
          // 🔹 Payment data extraction (only if valid)
          if (control.is_order && extracted.payment_data) {
            payment_data = {
              amount: extracted.payment_data.amount || 0,
              bill_html: extracted.payment_data.bill_html || '',
              currency: extracted.payment_data.currency || 'INR',
              gst_number: extracted.payment_data.gst_number || 'GST123456',
              gst_total: extracted.payment_data.gst_total || 0,
              key: RAZORPAY_KEY_ID,
              order_id: extracted.payment_data.order_id || `order_${Date.now()}`,
              payment_time: extracted.payment_data.payment_time || new Date().toISOString(),
              robot_charge: extracted.payment_data.robot_charge || 50,
              sub_total: extracted.payment_data.sub_total || 0,
              table_number: extracted.payment_data.table_number || 'PDR1',
              total_amount: extracted.payment_data.total_amount || extracted.payment_data.amount || 0,
            };
            //   manoj comm...   console.log('[DEBUG] Payment data:', payment_data);
          }
        }
      } catch (e) {
        //   manoj comm...   console.log('[DEBUG] Failed to parse JSON line:', e);
      }
    }

    //   manoj comm...   console.log('[DEBUG] Final return object:', { response: finalAnswer, control, payment_data });

    // 🔹 Save conversation to file (create if not exists, then append)


    try {
      const dirPath = `${RNFS.DocumentDirectoryPath}/conversations`;

      // Create directory if it doesn't exist
      const dirExists = await RNFS.exists(dirPath);
      if (!dirExists) {
        await RNFS.mkdir(dirPath);
      }

      const filePath = `${dirPath}/${session_id}.txt`;

      // Create file if it doesn't exist
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        await RNFS.writeFile(filePath, '', 'utf8');
      }

      const logEntry = `user: ${userText}\n\nbot: ${finalAnswer}\n\n---------------------------\n`;

      await RNFS.appendFile(filePath, logEntry, 'utf8');
      console.log(`[DEBUG] Conversation appended to ${filePath}`);
    } catch (err) {
      //   manoj comm...   console.log('[ERROR] Failed to write conversation log:', err.message);
    }


// debugger;
console.log('finalAnswer', finalAnswer);
console.log('control', control);
console.log('payment_data', payment_data);
console.log('dish_mapping', dish_mapping);  
    return {
      response: finalAnswer.replace(/\n/g, ' '),
      control,
      payment_data,
      dish_mapping
    };
  } catch (error) {
    //   manoj comm...   console.log('[ERROR] Failed to get RAGFlow response:', error.message);
    throw error;
  }
};


export const sendUserTextSTOP = async (
  session_id: string,
  userText: string,
): Promise<BotResponse> => {
  if (!session_id || !userText) {
    throw new Error('Invalid input to sendUserText');
  }

  const payload = { question: userText, session_id };

  const res = await fetch(
    `${RAGFLOW_BASE_URL}/api/v1/agentbots/${RAGFLOW_BOT_ID}/completions`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to sendUserText: ${res.status} ${err}`);
  }

  const text = await res.text();
  const lines = text.trim().split('\n');
  let finalAnswer = '';
  let control: Control = {
    disconnect: '0',
    session_id,
    audio: '',
    slots: {},
    is_order: 0,
    order: {},
    language: 'hi-IN-KavyaNeural',
    notes: '',
    show_menu: 0,
    order_info: {},
  };
  let payment_data: any = null;
  let dish_mapping: any = {};

  for (const rawLine of lines) {
    const line = rawLine.replace('data:', '').trim();
    if (!line) continue;

    try {
      const parsed = JSON.parse(line);
      if (parsed.data && parsed.data.answer) {
        let answer: string = parsed.data.answer;
        const jsonDelimiter = '\n\n{';
        let extracted: any = {};

        const jsonStart = answer.indexOf(jsonDelimiter);
        if (jsonStart !== -1) {
          const possibleJson = answer.slice(jsonStart + jsonDelimiter.length).trim();
          if (possibleJson.includes('{') && possibleJson.includes('}')) {
            const jsonStrMatch = possibleJson.match(/\{[\s\S]*\}/);
            if (jsonStrMatch) {
              extracted = safeParseJSON(jsonStrMatch[0]);
            }
          }
          answer = answer.slice(0, jsonStart).trim();
        }

        answer = answer
          .replace(/\*+/g, ' ')
          .replace(/&/g, ' ')
          .replace(/’/g, "'")
          .replace(/\s{2,}/g, ' ');

        finalAnswer = answer;

        control = {
          audio: extracted.control?.audio || '',
          disconnect: String(extracted.control?.disconnect ?? extracted.disconnect ?? '0'),
          is_order: extracted.control?.is_order || 0,
          language: extracted.control?.language || 'hi-IN-KavyaNeural',
          notes: extracted.control?.notes || '',
          order: extracted.control?.order || {},
          order_info: extracted.control?.order_info || {},
          session_id: extracted.control?.session_id || parsed.data.session_id || session_id,
          show_menu: extracted.control?.show_menu ?? extracted.show_menu ?? 0,
          slots: extracted.control?.slots || {},
          customer: extracted.customer || { name: '', phone: '', email: '' },
          special_notes: extracted.special_notes || {},
          dish_mapping: extracted.dish_mapping || {},
          payment_data: extracted.payment_data || null,
        };

        dish_mapping = extracted.dish_mapping || {};

        if (control.is_order && extracted.payment_data) {
          payment_data = {
            amount: extracted.payment_data.amount || 0,
            bill_html: extracted.payment_data.bill_html || '',
            currency: extracted.payment_data.currency || 'INR',
            gst_number: extracted.payment_data.gst_number || 'GST123456',
            gst_total: extracted.payment_data.gst_total || 0,
            key: RAZORPAY_KEY_ID,
            order_id: extracted.payment_data.order_id || `order_${Date.now()}`,
            payment_time:
              extracted.payment_data.payment_time || new Date().toISOString(),
            robot_charge: extracted.payment_data.robot_charge || 50,
            sub_total: extracted.payment_data.sub_total || 0,
            table_number: extracted.payment_data.table_number || 'PDR1',
            total_amount:
              extracted.payment_data.total_amount || extracted.payment_data.amount || 0,
          } as PaymentData;
        }
      }
    } catch (e) {
      console.log('[sendUserText] parse line error', e);
    }
  }

  if (!finalAnswer) throw new Error('No answer in sendUserText response');
  // debugger;
  const manoj = finalAnswer.replace(/\n/g, ' ');
  return {
    response: "manoj",
    control,
    payment_data,
    dish_mapping,
  };
};
