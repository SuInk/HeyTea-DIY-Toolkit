import axios from 'axios';

import { BACKEND_API_BASE, CUP_HEIGHT, CUP_WIDTH } from '@/config/heytea';

export interface CaptchaPayload {
  ticket: string;
  randstr: string;
}

const http = axios.create({
  baseURL: BACKEND_API_BASE,
  timeout: 60000,
});

export async function sendSmsCode(
  mobile: string,
  captcha?: CaptchaPayload
): Promise<{ requiresCaptcha: boolean; message?: string }> {
  const { data } = await http.post('/sms/send', {
    mobile,
    ticket: captcha?.ticket,
    randstr: captcha?.randstr,
  });
  return data;
}

export async function loginWithSms(mobile: string, smsCode: string) {
  const { data } = await http.post<{ token: string }>('/login/sms', {
    mobile,
    smsCode,
  });
  return data.token;
}

export interface HeyTeaUser {
  name: string;
  user_main_id: number;
  [key: string]: unknown;
}

export async function fetchUserInfo(token: string): Promise<HeyTeaUser> {
  const { data } = await http.get<{ user: HeyTeaUser }>('/user', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data.user;
}

export interface UploadParams {
  token: string;
  userMainId: number;
  blob: Blob;
  filename?: string;
}

export async function uploadCupSticker({ token, userMainId, blob, filename = 'cup.png' }: UploadParams) {
  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('token', token);
  formData.append('userMainId', String(userMainId));
  formData.append('width', String(CUP_WIDTH));
  formData.append('height', String(CUP_HEIGHT));

  const { data } = await http.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data;
}
