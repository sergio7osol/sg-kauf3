import axios from 'axios';
import type {
  ReceiptParseResponse,
  ParsedReceiptData,
  ReceiptConfidence
} from '~/types';

/**
 * Composable for handling receipt file upload and parsing.
 * Follows SRP: Only responsible for receipt parsing API communication.
 */
export const useReceiptParser = () => {
  // State
  const isUploading = ref(false);
  const isParsing = ref(false);
  const parseError = ref<string | null>(null);
  const parseWarnings = ref<string[]>([]);
  const confidence = ref<ReceiptConfidence | null>(null);
  const parsedData = ref<ParsedReceiptData | null>(null);
  const supportedShops = ref<string[]>([]);

  /**
   * Upload and parse a receipt file.
   * @param file - The receipt file (PDF or image)
   * @param debug - Include debug information in response
   * @returns Parsed receipt data or null on failure
   */
  async function parseReceipt(
    file: File,
    debug: boolean = false
  ): Promise<ParsedReceiptData | null> {
    isUploading.value = true;
    isParsing.value = true;
    parseError.value = null;
    parseWarnings.value = [];
    confidence.value = null;
    parsedData.value = null;

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (debug) {
        formData.append('debug', '1');
      }

      const { data } = await axios.post<ReceiptParseResponse>(
        '/receipts/parse',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Handle parsing response
      if (data.success && data.data) {
        parsedData.value = data.data;
        parseWarnings.value = data.warnings || [];
        confidence.value = data.confidence;
        return data.data;
      } else {
        // Parsing failed but API responded
        parseError.value = data.error || 'Failed to parse receipt';
        confidence.value = data.confidence || 'low';
        return null;
      }
    } catch (err: unknown) {
      // Handle validation errors (422)
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        const errors = err.response.data?.errors as { file?: string | string[] } | undefined;
        const fileError = errors?.file;
        if (fileError) {
          const resolvedError = Array.isArray(fileError) ? fileError[0] : fileError;
          parseError.value = resolvedError ?? 'Validation failed';
        } else {
          parseError.value = err.response.data?.message ?? 'Validation failed';
        }
      } else {
        parseError.value = 'Failed to upload receipt. Please try again.';
      }
      console.error('Receipt parsing error:', err);
      return null;
    } finally {
      isUploading.value = false;
      isParsing.value = false;
    }
  }

  /**
   * Fetch the list of supported shops for receipt parsing.
   */
  async function fetchSupportedShops(): Promise<string[]> {
    try {
      const { data } = await axios.get<{ data: string[] }>('/receipts/supported-shops');
      supportedShops.value = data.data || [];
      return supportedShops.value;
    } catch (err: unknown) {
      console.error('Failed to fetch supported shops:', err);
      return [];
    }
  }

  /**
   * Reset all parsing state.
   */
  function resetState() {
    isUploading.value = false;
    isParsing.value = false;
    parseError.value = null;
    parseWarnings.value = [];
    confidence.value = null;
    parsedData.value = null;
  }

  /**
   * Allowed file types for receipt upload.
   */
  const allowedFileTypes = 'application/pdf,image/png,image/jpeg,image/jpg,image/webp';
  const maxFileSizeMB = 10;

  /**
   * Validate file before upload.
   */
  function validateFile(file: File): { valid: boolean, error?: string } {
    const allowedMimes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp'
    ];

    if (!allowedMimes.includes(file.type)) {
      return {
        valid: false,
        error: 'Please upload a PDF or image file (PNG, JPG, JPEG, WebP)'
      };
    }

    const maxBytes = maxFileSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return {
        valid: false,
        error: `File size must be less than ${maxFileSizeMB}MB`
      };
    }

    return { valid: true };
  }

  return {
    // State
    isUploading,
    isParsing,
    parseError,
    parseWarnings,
    confidence,
    parsedData,
    supportedShops,

    // Actions
    parseReceipt,
    fetchSupportedShops,
    resetState,
    validateFile,

    // Constants
    allowedFileTypes,
    maxFileSizeMB
  };
};
