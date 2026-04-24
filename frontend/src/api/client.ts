import axios, { AxiosInstance, AxiosError } from 'axios'
import {
  ReconcileRequest,
  ReconcileResponse,
  ExportRequest,
  ExportResponse,
} from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

class APIClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor for auth tokens (if needed)
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          localStorage.removeItem('authToken')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  async reconcile(request: ReconcileRequest): Promise<ReconcileResponse> {
    const response = await this.client.post<ReconcileResponse>(
      '/reconcile',
      request
    )
    return response.data
  }

  async upload(sourceContent: string, targetContent: string): Promise<void> {
    await this.client.post('/upload', {
      sourceContent,
      targetContent,
    })
  }

  async export(request: ExportRequest): Promise<ExportResponse> {
    const response = await this.client.post<ExportResponse>(
      '/export',
      request
    )
    return response.data
  }

  async getResult(resultId: string) {
    const response = await this.client.get(`/results/${resultId}`)
    return response.data
  }

  async listResults(page: number = 1, pageSize: number = 10) {
    const response = await this.client.get('/results', {
      params: { page, pageSize },
    })
    return response.data
  }
}

export const apiClient = new APIClient()
export default apiClient
