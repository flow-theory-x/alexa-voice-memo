// Alexa Types
export interface AlexaRequest {
  version: string;
  session: AlexaSession;
  context: AlexaContext;
  request: AlexaRequestBody;
}

export interface AlexaSession {
  new: boolean;
  sessionId: string;
  application: { applicationId: string };
  user: { userId: string };
  attributes?: { [key: string]: any };
}

export interface AlexaContext {
  System: {
    application: { applicationId: string };
    user: { userId: string };
    device: { deviceId: string };
  };
}

export interface AlexaRequestBody {
  type: 'LaunchRequest' | 'IntentRequest' | 'SessionEndedRequest';
  requestId: string;
  timestamp: string;
  locale?: string;
  intent?: AlexaIntent;
  reason?: string;
}

export interface AlexaIntent {
  name: string;
  confirmationStatus: string;
  slots?: { [key: string]: AlexaSlot };
}

export interface AlexaSlot {
  name: string;
  value?: string;
  confirmationStatus: string;
}

export interface AlexaResponse {
  version: string;
  response: {
    outputSpeech: {
      type: 'PlainText';
      text: string;
    };
    shouldEndSession: boolean;
    reprompt?: {
      outputSpeech: {
        type: 'PlainText';
        text: string;
      };
    };
  };
  sessionAttributes?: { [key: string]: any };
}

// Memo Types
export interface MemoItem {
  userId: string;
  memoId: string;
  text: string;
  timestamp: string;
  deleted: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}