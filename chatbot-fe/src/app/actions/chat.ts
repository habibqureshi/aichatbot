"use server"

import { API } from '@/app/http/axio';
import { ENDPOINTS } from '@/app/http/endpoints';
import { AxiosResponse } from 'axios';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  message: string;
  conversationId: string;
}

export async function sendMessage(query: string, conversationId?: string): Promise<AxiosResponse> {
  try {
    const response = await API.post(
      ENDPOINTS.AI.SEND_MESSAGE,
      {},
      {
        
          responseType: "stream",
          params: {
            query: query,
            id: conversationId,
          },
     
        headers: {
          Accept: "text/event-stream",
          'Content-type': "application/x-www-form-urlencoded", 
        },

      }
    );
    return response;

    // return {
    //   message: response.data.message,
    //   conversationId: response.data.conversationId
    // };
  } catch (error) {
    console.error('Error sending message:', error);
    throw new Error('Failed to send message');
  }
}


export async function uploadTrainingFile(formData: FormData): Promise<AxiosResponse> {
  try {
    const response = await API.post(
      ENDPOINTS.RAG.UPLOAD_FILE,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    // console.log(response.data)
    return response.data;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
}

