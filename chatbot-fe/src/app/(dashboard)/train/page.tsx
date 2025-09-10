"use client"

import { useState } from 'react'
import { uploadTrainingFile } from '@/app/actions/chat'

export default function TrainPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!file) {
      setMessage('Please select a file.')
      return
    }
    setIsUploading(true)
    setMessage(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await uploadTrainingFile(formData)
      setMessage( 'Uploaded successfully')
    } catch (err: any) {
      setMessage(err?.message || 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Train Knowledge Base</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="file"
          accept=".txt,.pdf,.csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <div>
          <button
            type="submit"
            disabled={isUploading || !file}
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : 'Upload & Train'}
          </button>
        </div>
      </form>
      {message && (
        <p className="mt-4 text-sm text-gray-700">{message}</p>
      )}
    </div>
  )
}


