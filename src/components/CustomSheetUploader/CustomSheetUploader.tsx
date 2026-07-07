import React, { useState, useCallback } from 'react'
import {
  Box,
  Button,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  IconButton
} from '@mui/material'
import { useDropzone } from 'react-dropzone'
import { FiUpload, FiFile, FiX, FiDatabase } from 'react-icons/fi'
import * as XLSX from 'xlsx'
import type { CustomSheetUploaderProps, FilePreviewData, ProcessedSheetData } from './types'

export const CustomSheetUploader: React.FC<CustomSheetUploaderProps> = ({
  fields,
  onFileUpload,
  onError,
  maxFileSize = 1000 * 1024 * 1024, // 10MB default
  showPreview = true,
  maxPreviewRows = 5,
  loadingMessage = 'Processing file...',
  uploadMessage = 'Drop your Excel or CSV file here or click to browse',
  enableDragDrop = true,
  autoMapHeaders = true,
  customStyles = {}
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [filePreview, setFilePreview] = useState<FilePreviewData | null>(null)
  const [processedData, setProcessedData] = useState<ProcessedSheetData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const processFile = useCallback(async (file: File) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const arrayBuffer = await file.arrayBuffer()
      let workbook: any
      
      // Handle different file types
      if (file.name.toLowerCase().endsWith('.csv')) {
        // For CSV files, create a simple workbook structure
        const text = new TextDecoder().decode(arrayBuffer)
        const csvData = text.split('\n').map(row => 
          row.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
        ).filter(row => row.some(cell => cell !== ''))
        
        // Create a workbook-like structure for CSV
        workbook = {
          SheetNames: ['Sheet1'],
          Sheets: {
            'Sheet1': XLSX.utils.aoa_to_sheet(csvData)
          }
        }
      } else {
        // For Excel files
        workbook = XLSX.read(arrayBuffer, {
          type: 'array',
          cellDates: true,
          dateNF: 'yyyy-mm-dd'
        })
      }

      const sheetNames = workbook.SheetNames
      if (sheetNames.length === 0) {
        throw new Error('No sheets found in the file')
      }

      // Process the first sheet by default
      const firstSheetName = sheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        raw: false
      }) as string[][]

      if (jsonData.length === 0) {
        throw new Error('The file is empty')
      }

      // Extract headers (first row)
      const headers = jsonData[0] || []
      const dataRows = jsonData.slice(1).filter(row => row.some(cell => cell !== ''))

      // Create preview data
      const previewData = jsonData.slice(0, maxPreviewRows + 1) // +1 for header
      
      const filePreviewData: FilePreviewData = {
        fileName: file.name,
        fileSize: file.size,
        sheetNames,
        previewData,
        totalRows: dataRows.length,
        totalColumns: headers.length
      }

      const processedSheetData: ProcessedSheetData = {
        sheetName: firstSheetName,
        headers,
        data: dataRows.map(row => {
          const obj: any = {}
          headers.forEach((header, index) => {
            obj[header] = row[index] || ''
          })
          return obj
        }),
        totalRows: dataRows.length
      }

      setFilePreview(filePreviewData)
      setProcessedData(processedSheetData)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process file'
      setError(errorMessage)
      if (onError) {
        onError(new Error(errorMessage))
      }
    } finally {
      setIsLoading(false)
    }
  }, [maxPreviewRows, onError])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: useCallback(async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        await processFile(acceptedFiles[0])
      }
    }, [processFile]),
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    maxSize: maxFileSize,
    disabled: !enableDragDrop || isLoading,
    onDropRejected: (fileRejections) => {
      const errors = fileRejections[0]?.errors || []
      const errorMessage = errors.length > 0 ? errors[0].message : 'File rejected'
      setError(`Upload failed: ${errorMessage}`)
    }
  })

  const handleImportToDatabase = useCallback(async () => {
    if (!processedData || !filePreview) return
    
    setIsLoading(true)
    try {
      await onFileUpload(processedData.data, new File([], filePreview.fileName))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import data'
      setError(errorMessage)
      if (onError) {
        onError(new Error(errorMessage))
      }
    } finally {
      setIsLoading(false)
    }
  }, [processedData, filePreview, onFileUpload, onError])

  const clearFile = useCallback(() => {
    setFilePreview(null)
    setProcessedData(null)
    setError(null)
  }, [])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Box sx={{ p: 3, maxWidth: '100%', ...customStyles.container }}>
      <Stack direction="column" spacing={3}>
        {/* Upload Area */}
        {!filePreview && (
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              bgcolor: isDragActive ? 'action.hover' : 'grey.50',
              cursor: enableDragDrop ? 'pointer' : 'default',
              transition: 'all 0.2s',
              '&:hover': enableDragDrop ? { borderColor: 'primary.main', bgcolor: 'action.hover' } : {},
              ...customStyles.dropZone
            }}
          >
            <input {...getInputProps()} />
            <Stack direction="column" spacing={2} alignItems="center">
              <FiUpload size={48} color={isDragActive ? '#1976d2' : '#9e9e9e'} />
              {isLoading ? (
                <Stack direction="column" spacing={1} alignItems="center">
                  <CircularProgress size={40} />
                  <Typography color="textSecondary">{loadingMessage}</Typography>
                </Stack>
              ) : (
                <>
                  <Typography variant="h6" color="textPrimary">
                    {uploadMessage}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Támogatott fájlformátumok: .xls, .xlsx, .csv.
                  </Typography>
                  {enableDragDrop && (
                    <Button
                      color="primary"
                      variant="outlined"
                      startIcon={<FiFile />}
                    >
                      Fájl kiválasztása
                    </Button>
                  )}
                </>
              )}
            </Stack>
          </Box>
        )}

        {/* Error Display */}
        {error && (
          <Box sx={{ p: 2, bgcolor: 'error.light', borderRadius: 1, border: '1px solid', borderColor: 'error.main' }}>
            <Typography fontWeight="bold" color="error.dark">Error!</Typography>
            <Typography color="error.dark">{error}</Typography>
          </Box>
        )}

        {/* File Preview */}
        {filePreview && showPreview && (
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'grey.300',
              borderRadius: 2,
              p: 2,
              bgcolor: 'grey.50',
              ...customStyles.preview
            }}
          >
            <Stack direction="row" justifyContent="space-between" mb={2}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <FiFile size={20} />
                <Stack direction="column" spacing={0}>
                  <Typography fontWeight="medium" color="textPrimary">
                    {filePreview.fileName}
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="body2" color="textSecondary">
                      {formatFileSize(filePreview.fileSize)}
                    </Typography>
                    <Chip label={`${filePreview.totalRows} sorok`} color="primary" size="small" />
                    <Chip label={`${filePreview.totalColumns} oszlopok`} color="success" size="small" />
                  </Stack>
                </Stack>
              </Stack>
              <IconButton size="small" onClick={clearFile}>
                <FiX />
              </IconButton>
            </Stack>

            {/* Import Button */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Button
                color="primary"
                variant="contained"
                onClick={handleImportToDatabase}
                disabled={isLoading}
                startIcon={<FiDatabase />}
              >
                {isLoading ? 'Importálás...' : 'Adatok importálása'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={clearFile}
              >
                Új fájl kiválasztása
              </Button>
            </Stack>
          </Box>
        )}
      </Stack>
    </Box>
  )
}
