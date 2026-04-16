/**
 * UI copy for assertions and actions (buttons, menu, report field labels).
 * Override with `E2E_UI_*` for another locale or wording.
 */
export const form = {
    submit: process.env.E2E_UI_FORM_SUBMIT || 'Submit',
    submitFailed: process.env.E2E_UI_FORM_SUBMIT_FAILED || 'Submit failed',
    successfulSubmit: process.env.E2E_UI_FORM_SUCCESS || 'Submitted successfully',
};

export const menu = {
    home: process.env.E2E_UI_MENU_HOME || 'Home',
    reports: process.env.E2E_UI_MENU_REPORTS || 'Reports',
    petMovers: process.env.E2E_UI_MENU_PET_MOVERS || 'PetMovers',
    petShipping: process.env.E2E_UI_MENU_PET_SHIPPING || 'PetShipping',
    booking: process.env.E2E_UI_MENU_BOOKING || 'Booking',
    points: process.env.E2E_UI_MENU_POINTS || 'Points',
};

export const petShipping = {
    title: process.env.E2E_UI_PET_SHIPPING_TITLE || 'PetShipping',
    addButton: process.env.E2E_UI_PET_SHIPPING_ADD || 'Add pet ship',
    save: process.env.E2E_UI_SCHEDULE_SAVE || 'Save',
    toastCreated: process.env.E2E_UI_SCHEDULE_TOAST_CREATED || 'Pet ship created',
    toastUpdated: process.env.E2E_UI_SCHEDULE_TOAST_UPDATED || 'Pet ship updated',
    toastDeleted: process.env.E2E_UI_SCHEDULE_TOAST_DELETED || 'Pet ship deleted',
    statusPlanned: process.env.E2E_UI_SCHEDULE_STATUS_PLANNED || 'Planned',
    statusActive: process.env.E2E_UI_SCHEDULE_STATUS_ACTIVE || 'In transit',
    statusDone: process.env.E2E_UI_SCHEDULE_STATUS_DONE || 'Completed',
};

export const booking = {
    title: process.env.E2E_UI_BOOKING_TITLE || 'Booking',
    fieldPetShip: process.env.E2E_UI_BOOKING_PET_SHIP || 'Pet ship',
    save: process.env.E2E_UI_BOOKING_SAVE || 'Save',
    toastCreated: process.env.E2E_UI_BOOKING_TOAST_CREATED || 'Booking created',
    toastUpdated: process.env.E2E_UI_BOOKING_TOAST_UPDATED || 'Booking updated',
    toastDeleted: process.env.E2E_UI_BOOKING_TOAST_DELETED || 'Booking deleted',
};

export const points = {
    title: process.env.E2E_UI_POINTS_TITLE || 'Points',
    save: process.env.E2E_UI_POINTS_SAVE || 'Save',
    toastCreated: process.env.E2E_UI_POINTS_TOAST_CREATED || 'Point created',
    toastUpdated: process.env.E2E_UI_POINTS_TOAST_UPDATED || 'Point updated',
    toastDeleted: process.env.E2E_UI_POINTS_TOAST_DELETED || 'Point deleted',
    kindHub: process.env.E2E_UI_POINTS_KIND_HUB || 'Hub',
    kindStop: process.env.E2E_UI_POINTS_KIND_STOP || 'Stop',
    kindAirport: process.env.E2E_UI_POINTS_KIND_AIRPORT || 'Airport',
};

/** @deprecated Use `petShipping` */
export const movementSchedule = petShipping;
/** @deprecated Use `booking` */
export const bookingRecords = booking;
/** @deprecated Use `points` */
export const pointsCrud = points;

export const petMovers = {
    title: process.env.E2E_UI_PET_MOVERS_TITLE || 'PetMovers',
    addButton: process.env.E2E_UI_PET_MOVERS_ADD || 'Add PetMover',
    fieldName: process.env.E2E_UI_PET_MOVERS_NAME || 'Name',
    fieldCode: process.env.E2E_UI_PET_MOVERS_CODE || 'Code',
    fieldRegion: process.env.E2E_UI_PET_MOVERS_REGION || 'Region',
    fieldActive: process.env.E2E_UI_PET_MOVERS_ACTIVE || 'Active',
    save: process.env.E2E_UI_PET_MOVERS_SAVE || 'Save',
    toastCreated: process.env.E2E_UI_PET_MOVERS_TOAST_CREATED || 'PetMover created',
    toastUpdated: process.env.E2E_UI_PET_MOVERS_TOAST_UPDATED || 'PetMover updated',
    toastDeleted: process.env.E2E_UI_PET_MOVERS_TOAST_DELETED || 'PetMover deleted',
};

export const reports = {
    petMover: process.env.E2E_UI_REPORT_PET_MOVER || 'PetMover',
    dateRange: process.env.E2E_UI_REPORT_DATE_RANGE || 'Date',
    fileType: process.env.E2E_UI_REPORT_FILE_TYPE || 'Format',
    paymentType: process.env.E2E_UI_REPORT_PAYMENT || 'Payment methods',
    currency: process.env.E2E_UI_REPORT_CURRENCY || 'Currency',
    sendReportTo: process.env.E2E_UI_REPORT_SEND_TO || 'Send report to',
    download: process.env.E2E_UI_REPORT_DOWNLOAD || 'Download',
    datePlaceholderStart: process.env.E2E_UI_DATE_RANGE_START_PH || 'Start date',
    datePlaceholderEnd: process.env.E2E_UI_DATE_RANGE_END_PH || 'End date',
    timePlaceholderStart: process.env.E2E_UI_TIME_RANGE_START_PH || 'Start time',
    timePlaceholderEnd: process.env.E2E_UI_TIME_RANGE_END_PH || 'End time',
};
