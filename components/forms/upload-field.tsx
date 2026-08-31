'use client'

import React, { forwardRef, useState, useId, useRef } from 'react'
import { UploadCloud, File, Image as ImageIcon, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BaseFieldProps } from './types'
import { FieldWrapper } from './field-wrapper'

export interface UploadedFileItem {
  id: string
  file: File
  name: string
  size: number
  type: string
  previewUrl?: string
  progress?: number
}

export interface UploadFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'value' | 'onChange' | 'prefix'>,
    BaseFieldProps {
  onFilesChange?: (files: File[]) => void
  maxFiles?: number
  maxSizeMB?: number
  accept?: string
  multiple?: boolean
  showPreviewList?: boolean
}

export const UploadField = forwardRef<HTMLInputElement, UploadFieldProps>(
  (
    {
      id: customId,
      name,
      label,
      sublabel,
      hint,
      error,
      success,
      warning,
      required,
      disabled,
      size = 'md',
      status = 'default',
      inline,
      className,
      wrapperClassName,
      labelClassName,
      hintClassName,
      errorClassName,
      icon,
      iconPosition,
      startAdornment,
      endAdornment,
      prefix,
      suffix,
      onFilesChange,
      maxFiles = 5,
      maxSizeMB = 10,
      accept,
      multiple = false,
      showPreviewList = true,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const id = customId || generatedId
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const [fileList, setFileList] = useState<UploadedFileItem[]>([])
    const [isDragging, setIsDragging] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)

    const effectiveStatus = uploadError ? 'error' : error ? 'error' : success ? 'success' : warning ? 'warning' : status
    const effectiveError = uploadError || error

    const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
    }

    const processFiles = (incoming: FileList | null) => {
      if (!incoming || incoming.length === 0) return
      setUploadError(null)

      const filesArray = Array.from(incoming)
      const validFiles: UploadedFileItem[] = []

      for (const file of filesArray) {
        if (file.size > maxSizeMB * 1024 * 1024) {
          setUploadError(`"${file.name}" exceeds maximum allowed size of ${maxSizeMB}MB`)
          return
        }

        const isImage = file.type.startsWith('image/')
        const item: UploadedFileItem = {
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          previewUrl: isImage ? URL.createObjectURL(file) : undefined,
          progress: 100,
        }
        validFiles.push(item)
      }

      const updated = multiple ? [...fileList, ...validFiles].slice(0, maxFiles) : [validFiles[0]]
      setFileList(updated)
      onFilesChange?.(updated.map(f => f.file))
    }

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled) return
      processFiles(e.dataTransfer.files)
    }

    const handleRemove = (fileId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      const updated = fileList.filter(f => f.id !== fileId)
      setFileList(updated)
      onFilesChange?.(updated.map(f => f.file))
    }

    return (
      <FieldWrapper
        id={id}
        label={label}
        sublabel={sublabel}
        hint={hint}
        error={effectiveError}
        success={success}
        warning={warning}
        required={required}
        inline={inline}
        status={effectiveStatus}
        wrapperClassName={wrapperClassName}
        labelClassName={labelClassName}
        hintClassName={hintClassName}
        errorClassName={errorClassName}
      >
        <div className="flex flex-col gap-3 w-full">
          {/* Dropzone container */}
          <div
            onDragOver={e => {
              e.preventDefault()
              if (!disabled) setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !disabled && fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-6 transition-all flex flex-col items-center justify-center text-center cursor-pointer select-none',
              isDragging ? 'border-primary bg-primary/5 scale-[0.99]' : 'border-border bg-card/60 hover:bg-muted/40 hover:border-ring/50',
              effectiveStatus === 'error' && 'border-destructive bg-destructive/5',
              disabled && 'opacity-50 cursor-not-allowed',
              className
            )}
          >
            <input
              ref={el => {
                fileInputRef.current = el
                if (typeof ref === 'function') ref(el)
                else if (ref) ref.current = el
              }}
              id={id}
              name={name}
              type="file"
              accept={accept}
              multiple={multiple}
              disabled={disabled}
              onChange={e => processFiles(e.target.files)}
              className="sr-only"
              {...props}
            />

            <div className="size-11 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3 shadow-xs">
              <UploadCloud className="size-5" />
            </div>

            <p className="text-sm font-semibold text-foreground">
              Click to upload <span className="font-normal text-muted-foreground">or drag and drop</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {accept ? `Supported files: ${accept}` : 'Images, PDF, documents'} · Max {maxSizeMB}MB per file
            </p>
          </div>

          {/* Uploaded Files List */}
          {showPreviewList && fileList.length > 0 && (
            <div className="space-y-2">
              {fileList.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card shadow-xs gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.previewUrl ? (
                      <img
                        src={item.previewUrl}
                        alt={item.name}
                        className="size-10 rounded-md object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="size-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                        <File className="size-5" />
                      </div>
                    )}
                    <div className="min-w-0 truncate">
                      <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">{formatBytes(item.size)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-success text-xs flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" />
                    </span>
                    {!disabled && (
                      <button
                        type="button"
                        onClick={e => handleRemove(item.id, e)}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                        aria-label={`Remove file ${item.name}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </FieldWrapper>
    )
  }
)

UploadField.displayName = 'UploadField'
