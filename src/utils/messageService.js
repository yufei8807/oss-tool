// Message service to handle antd message notifications
let messageApi = null;

export const setMessageApi = (api) => {
  messageApi = api;
};

export const showMessage = {
  success: (content) => {
    if (messageApi) {
      messageApi.success(content);
    } else {
      console.log('Success:', content);
    }
  },
  error: (content) => {
    if (messageApi) {
      messageApi.error(content);
    } else {
      console.error('Error:', content);
    }
  },
  warning: (content) => {
    if (messageApi) {
      messageApi.warning(content);
    } else {
      console.warn('Warning:', content);
    }
  },
  info: (content) => {
    if (messageApi) {
      messageApi.info(content);
    } else {
      console.info('Info:', content);
    }
  }
};