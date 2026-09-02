'use client'

import { useCallback, useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

export type AttachmentUploadState =
  | 'idle'
  | 'uploading'
  | 'scanning'
  | 'complete'
  | 'error'
  | 'quarantined'

export interface AttachmentUploadItem {
  localId: string
  fileName: string
  sizeBytes: number
  progress: number
  state: AttachmentUploadState
  error?: string
  attachmentId?: Id<'encounterAttachmentMetadata'>
}

interface UploadClinicalAttachmentArgs {
  patientId: Id<'patients'>
  encounterId?: Id<'clinicalEncounters'>
  messageId?: Id<'messages'>
  contextType: 'encounter' | 'message'
  file: File
}

export function useClinicalAttachmentUpload() {
  const generateUploadUrl = useMutation(api.attachments.generateUploadUrl)
  const finalizeUpload = useMutation(api.attachments.finalizeUpload)
  const markUploadFailed = useMutation(api.attachments.markUploadFailed)

  const [items, setItems] = useState<AttachmentUploadItem[]>([])
  const [liveMessage, setLiveMessage] = useState('')
  const xhrRef = useRef<XMLHttpRequest | null>(null)

  const announce = useCallback((message: string) => {
    setLiveMessage('')
    requestAnimationFrame(() => setLiveMessage(message))
  }, [])

  const updateItem = useCallback((localId: string, patch: Partial<AttachmentUploadItem>) => {
    setItems(prev => prev.map(item => (item.localId === localId ? { ...item, ...patch } : item)))
  }, [])

  const uploadFile = useCallback(
    async (args: UploadClinicalAttachmentArgs): Promise<Id<'encounterAttachmentMetadata'> | null> => {
      const localId = `${args.file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`
      setItems(prev => [
        ...prev,
        {
          localId,
          fileName: args.file.name,
          sizeBytes: args.file.size,
          progress: 0,
          state: 'uploading',
        },
      ])
      announce(`Starting upload for ${args.file.name}`)

      let attachmentId: Id<'encounterAttachmentMetadata'> | null = null

      try {
        const staged = await generateUploadUrl({
          patientId: args.patientId,
          contextType: args.contextType,
          encounterId: args.encounterId,
          messageId: args.messageId,
          fileName: args.file.name,
          mimeType: args.file.type || 'application/octet-stream',
          sizeBytes: args.file.size,
        })
        attachmentId = staged.attachmentId

        const storageId = await new Promise<Id<'_storage'>>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhrRef.current = xhr
          xhr.open('POST', staged.uploadUrl)
          xhr.setRequestHeader('Content-Type', args.file.type || 'application/octet-stream')

          xhr.upload.onprogress = event => {
            if (!event.lengthComputable) return
            const progress = Math.round((event.loaded / event.total) * 100)
            updateItem(localId, { progress })
          }

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const body = JSON.parse(xhr.responseText) as { storageId: Id<'_storage'> }
                resolve(body.storageId)
              } catch {
                reject(new Error('Invalid upload response from storage.'))
              }
              return
            }
            reject(new Error(`Upload failed with status ${xhr.status}.`))
          }

          xhr.onerror = () => reject(new Error('Network error during upload.'))
          xhr.onabort = () => reject(new Error('Upload cancelled.'))
          xhr.send(args.file)
        })

        updateItem(localId, { progress: 100, state: 'scanning' })
        announce(`Scanning ${args.file.name}`)

        await finalizeUpload({ attachmentId: staged.attachmentId, storageId })

        updateItem(localId, {
          state: 'complete',
          attachmentId: staged.attachmentId,
        })
        announce(`Upload complete for ${args.file.name}`)
        return staged.attachmentId
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed.'
        updateItem(localId, { state: 'error', error: message })
        announce(`Upload failed for ${args.file.name}: ${message}`)
        if (attachmentId) {
          try {
            await markUploadFailed({ attachmentId })
          } catch {
            // Best-effort cleanup signal for orphaned metadata.
          }
        }
        return null
      } finally {
        xhrRef.current = null
      }
    },
    [announce, finalizeUpload, generateUploadUrl, markUploadFailed, updateItem]
  )

  const clearCompleted = useCallback(() => {
    setItems(prev => prev.filter(item => item.state !== 'complete'))
  }, [])

  const cancelUpload = useCallback(() => {
    xhrRef.current?.abort()
  }, [])

  return {
    items,
    liveMessage,
    uploadFile,
    clearCompleted,
    cancelUpload,
  }
}
