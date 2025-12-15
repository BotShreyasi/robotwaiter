import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const isTablet = width >= 600;

export const styles = StyleSheet.create({
    // --- General Container Styles ---
    container: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#000',
    },
    containerLandscape: {
        flexDirection: 'row',
    },
    containerTablet: {
        padding: isTablet ? 20 : 0,
    },

    // --- Sidebar/Main Panel Styles ---
    sidebar: {
        width: '35%',
        backgroundColor: '#1c1c1e',
        padding: 15,
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#2c2c2e',
    },
    sidebarLandscape: {
        width: '35%',
        padding: 10,
    },
    sidebarTablet: {
        width: '40%',
        minWidth: 300,
        padding: 20,
    },
    mainPanel: {
        flex: 1,
        backgroundColor: '#000',
        alignItems: 'center',
        padding: 10,
    },
    mainPanelLandscape: {
        padding: 10,
    },
    mainPanelTablet: {
        padding: 5,
    },
    contentWrapper: {
        flex: 1,
        width: '100%',
        justifyContent: 'space-around',
        alignItems: 'center',
    },

    // --- Logo/Text/Button Styles (General) ---
    logo: {
        width: 70, height: 70, marginVertical: 20, borderRadius: 12, borderWidth: 2, borderColor: '#00eaff', marginBottom: 10,
    },
    logoLandscape: { width: 70, height: 70, marginVertical: 10, },
    logoTablet: { width: 120, height: 120, marginVertical: 25, },

    buttonSection: {
        width: '100%', gap: 20, alignItems: 'center',
    },
    button: {
        backgroundColor: '#0a84ff', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, width: '80%', alignItems: 'center',
        shadowColor: '#00eaff', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 2 }, shadowRadius: 5, elevation: 4,
    },
    buttonLandscape: { paddingVertical: 10, width: '80%', },
    buttonTablet: { paddingVertical: 16, paddingHorizontal: 25, borderRadius: 12, width: '85%', },

    buttonText: { color: '#fff', fontSize: 11, fontWeight: '600', },
    buttonTextLandscape: { fontSize: 11, },
    buttonTextTablet: { fontSize: 14, },

    mainLogo: {
        width: 100, height: 100, marginBottom: 40, borderRadius: 50, borderWidth: 1, borderColor: '#00eaff66',
    },
    mainLogoLandscape: { width: 80, height: 80, marginBottom: 20, },
    mainLogoTablet: { width: 135, height: 135, marginBottom: 80, },

    welcomeText: {
        color: '#00eaff', fontWeight: 'bold', textAlign: 'center', textShadowColor: '#00eaff99', textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 10, alignSelf: 'center', paddingHorizontal: 15, marginBottom: 40, letterSpacing: 1.5,
        fontSize: width < 400 ? 18 : width < 600 ? 22 : width < 900 ? 30 : 40,
        lineHeight: width < 400 ? 28 : width < 600 ? 36 : width < 900 ? 46 : 60,
    },
    welcomeTextLandscape: {
        fontSize: width < 600 ? 18 : width < 900 ? 26 : 34,
        lineHeight: width < 600 ? 28 : width < 900 ? 40 : 52, marginBottom: 20,
    },
    welcomeTextTablet: {
        fontSize: width < 1000 ? 40 : 54,
        lineHeight: width < 1000 ? 54 : 70, marginBottom: 90, letterSpacing: 2,
    },

    // --- Modal Styles (General) ---
    modalContainer: {
        flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center',
    },
    modalSmallBox: {
        backgroundColor: '#222', padding: 20, borderRadius: 10, width: '85%', maxHeight: '80%', alignItems: 'center', position: 'relative',
    },
    modalSmallBoxLandscape: { width: '60%', padding: 15, },
    modalSmallBoxTablet: { width: '60%', padding: 25, borderRadius: 15, maxHeight: '85%', },

    modalTitle: { fontSize: 18, color: '#fff', marginBottom: 20, },
    modalTitleLandscape: { fontSize: 14, marginBottom: 15, },
    modalTitleTablet: { fontSize: 22, marginBottom: 25, },

    // --- Pin/Pose Modal Professional Styles ---
    modalTitleProfessional: {
        fontSize: 22, fontWeight: '700', color: '#e4e2eaff', textAlign: 'center', marginBottom: 15,
        textShadowColor: '#00000033', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
    },
    modalTitleProfessionalLandscape: { fontSize: 18, marginBottom: 12, },
    modalTitleProfessionalTablet: { fontSize: 28, marginBottom: 20, },

    closeButton: { position: 'absolute', top: 10, right: 10, zIndex: 999, padding: 5 },
    closeText: { fontSize: 22, color: '#fff', },

    backButton: {
        position: 'absolute', top: 12, left: 12, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8,
        backgroundColor: '#444', shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 },
        shadowRadius: 3, elevation: 2, zIndex: 999,
    },
    backButtonText: { color: '#0a84ff', fontSize: 14, fontWeight: '600', },


    // --- Input/Submit Button Styles ---
    submitButton: {
        backgroundColor: '#0a84ff', padding: 12, borderRadius: 8, marginTop: 10,
    },
    submitButtonLandscape: { padding: 10, },
    submitButtonTablet: { padding: 15, borderRadius: 10, marginTop: 15, },

    submitButtonProfessional: {
        backgroundColor: '#0a84ff', paddingVertical: 14, paddingHorizontal: 25, borderRadius: 12, marginTop: 15,
        width: '70%', alignItems: 'center', shadowColor: '#00eaff', shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 }, shadowRadius: 5, elevation: 4,
    },

    otpContainer: {
        flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, width: '100%', paddingHorizontal: 10, gap: 8,
    },
    otpContainerLandscape: { gap: 6, },
    otpContainerTablet: { gap: 12, paddingHorizontal: 15, },

    otpInput: {
        flex: 1, width: 40, height: 50, backgroundColor: '#fff', borderRadius: 8, textAlign: 'center', fontSize: 18,
    },
    otpInputLandscape: { width: 35, height: 40, fontSize: 14, },
    otpInputTablet: { width: 60, height: 70, fontSize: 22, borderRadius: 10, },

    errorText: {
        color: '#ff4d4f', fontSize: 13, marginTop: 5, textAlign: 'center',
    },
    errorTextTablet: { fontSize: 16, marginTop: 8, },

    // --- Cart/Ordering Styles (Used in CartDisplay.tsx) ---
    middlePanel: { width: '100%', alignItems: 'center', },
    cartWrapper: {
        width: '95%', backgroundColor: '#101010', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12,
        shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 5, marginBottom: 10,
    },
    cartHeader: { marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#2c2c2e', },
    cartTitle: { fontSize: 16, fontWeight: 'bold', color: '#00eaff', },
    cartContainer: { maxHeight: 250, },
    cartScroll: { maxHeight: 150, },
    cartScrollTablet: { maxHeight: 800, },
    cartItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1c1c1e',
        padding: 10, borderRadius: 10, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#00eaff',
    },
    itemDetails: { flex: 2, paddingRight: 8, },
    itemControls: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end', },
    cartItemName: { color: '#ffffff', fontSize: 14, fontWeight: '600', },
    cartItemNameTablet: { fontSize: 18, },
    quantityButton: {
        borderWidth: 1, borderColor: '#00eaff', backgroundColor: 'transparent', width: 30, height: 30, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
    },
    quantityButtonText: { color: '#00eaff', fontSize: 18, fontWeight: '600', },
    quantityText: {
        backgroundColor: '#2a2a2a', color: '#fff', fontSize: 16, fontWeight: '600', paddingHorizontal: 12,
        paddingVertical: 4, borderRadius: 8, textAlign: 'center', marginHorizontal: 6, minWidth: 36,
    },
    cancelButton: {
        borderWidth: 1, borderColor: '#00eaff', backgroundColor: 'transparent', width: 30, height: 30, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center', marginLeft: 8,
    },
    totalContainer: { paddingTop: 10, borderTopWidth: 1, borderTopColor: '#2c2c2e', },
    subTotalText: { fontSize: 16, marginBottom: 3, color: '#ffffff', fontWeight: '600', },
    chargeText: { fontSize: 15, color: '#ccc', marginBottom: 2, },
    totalText: { fontSize: 16, fontWeight: 'bold', color: '#00eaff', },
    totalTextTablet: { fontSize: 20, },

    // --- Pin Modal Success State ---
    successContainer: { marginTop: 20, alignItems: 'center', },
    successIconWrapper: {
        width: 50, height: 50, borderRadius: 25, backgroundColor: '#0a84ff', justifyContent: 'center',
        alignItems: 'center', marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 3,
    },
    successIconText: { color: '#fff', fontSize: 24, fontWeight: 'bold', },
    successText: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 20, textAlign: 'center', },
    continueButton: {
        backgroundColor: '#0a84ff', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25,
        shadowColor: '#00eaff', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 3 }, shadowRadius: 6, elevation: 4,
    },
    continueButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center', },
    continueButtonTablet: { paddingVertical: 16, paddingHorizontal: 40, borderRadius: 30, },
    continueButtonTextTablet: { fontSize: 18, },

    // --- Pose/Table Grid Styles ---
    poseModalBox: {
        backgroundColor: '#1c1c1e', padding: 25, borderRadius: 15, alignItems: 'center', width: '85%', maxHeight: '90%',
        shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 6,
    },
    posesScrollContainer: {
        alignItems: 'center', paddingVertical: 10, width: '100%',
    },
    posesGridContainer: {
        flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10, width: '100%', paddingHorizontal: 5,
    },
    poseGridButton: {
        backgroundColor: '#0a84ff', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 8, width: '30%',
        marginVertical: 6, alignItems: 'center', shadowColor: '#00eaff', shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 }, shadowRadius: 5, elevation: 3,
    },
    buttonTextProfessional: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center', },

    // --- Confirm Modal Styles ---
    modalBox: {
        backgroundColor: '#222', padding: 20, borderRadius: 12, width: '50%', alignItems: 'center',
    },
    modalMessage: { color: '#fff', fontSize: 16, marginBottom: 20, textAlign: 'center', },
    modalButtons: { flexDirection: 'row', justifyContent: 'center', gap: 20, },
    confirmButton: {
        backgroundColor: '#ff4d4f', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6, minWidth: 80, alignItems: 'center',
    },
    cancelModalButton: {
        backgroundColor: '#444', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6, minWidth: 80, alignItems: 'center',
    },
    confirmText: { color: '#fff', fontWeight: 'bold', fontSize: 14, },
    cancelText: { color: '#ccc', fontSize: 14, },

    // ... (Other specific styles like billBox, menuButton, etc., should also be here)
    billBox: { width: '100%', height: 160, backgroundColor: 'transparent', borderRadius: 0, marginTop: 20, borderWidth: 0, },
    billBoxTablet: { height: 550, marginTop: 25, },

    modalBoxTablet: {
        padding: 25,
        borderRadius: 15,
        width: '55%',
    },

    //       modalMessage: {
    //     color: '#fff',
    //     fontSize: 16,
    //     marginBottom: 20,
    //     textAlign: 'center',
    //   },
    modalMessageTablet: {
        fontSize: 18,
        marginBottom: 25,
    },
    confirmButtonTablet: {
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 8,
        minWidth: 90,
    },

    confirmTextTablet: {
        fontSize: 16,
    },

    cancelModalButtonTablet: {
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 8,
        minWidth: 90,
    },
    cancelTextTablet: {
        fontSize: 16,
    },

    quantityTextTablet: {
        fontSize: 18,
        paddingHorizontal: 14,
        paddingVertical: 5,
    },

    cartItemPriceTablet: {
        fontSize: 14,
        marginTop: 3,
    },

    paymentWebView: {
        flex: 1,
        backgroundColor: '#000',
    },
    billBoxLandscape: {
        height: 180,
    },

    // --- Payment/Bill helpers ---
    paymentWebViewTablet: {
        flex: 1,
        backgroundColor: '#000',
    },

    // --- Menu/Toggle buttons (header right) ---
    menuButton: {
        backgroundColor: '#0a84ff',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        alignItems: 'center',
        alignSelf: 'flex-end',
        marginBottom: 10,
    },
    menuButtonLandscape: { paddingVertical: 8, paddingHorizontal: 14 },
    menuButtonTablet: { paddingVertical: 14, paddingHorizontal: 22, borderRadius: 12 },
    menuButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    menuButtonTextLandscape: { fontSize: 12 },
    menuButtonTextTablet: { fontSize: 16 },

    toggleIcon: {
        position: 'absolute',
        top: 14,
        left: 14,
        padding: 8,
        backgroundColor: '#111',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#00eaff55',
        zIndex: 10,
    },
    toggleIconLandscape: { top: 10, left: 10 },
    toggleIconTablet: { padding: 12 },
    toggleIconText: { color: '#fff', fontSize: 18, fontWeight: '700' },
    toggleIconTextLandscape: { fontSize: 18 },
    toggleIconTextTablet: { fontSize: 22 },

    // --- Bottom row banner ---
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 12,
    },
    bottomRowLandscape: { marginTop: 8 },
    bottomRowTablet: { marginTop: 20 },
    icon: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#00eaff55' },
    iconLandscape: { width: 32, height: 32 },
    iconTablet: { width: 48, height: 48 },
    experienceText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    experienceTextLandscape: { fontSize: 15 },
    experienceTextTablet: { fontSize: 20 },
});