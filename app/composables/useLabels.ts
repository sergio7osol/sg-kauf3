import axios from 'axios';
import type { Label } from '~/types';

export interface CreateLabelPayload {
  name: string
  description?: string | null
}

export interface UpdateLabelPayload {
  name?: string
  description?: string | null
}

interface LabelsListResponse {
  data: Label[]
}

interface LabelResponse {
  data: Label
}

interface DeleteResponse {
  message: string
}

export const useLabels = () => {
  const labels = useState<Label[]>('labels', () => []);
  const isLoading = useState('labelsLoading', () => false);
  const error = useState<string | null>('labelsError', () => null);

  const label = useState<Label | null>('label', () => null);
  const labelLoading = useState('labelLoading', () => false);
  const labelError = useState<string | null>('labelError', () => null);

  async function fetchLabels() {
    isLoading.value = true;
    error.value = null;

    try {
      const { data } = await axios.get<LabelsListResponse>('/labels');
      labels.value = Array.isArray(data.data) ? data.data : [];
      return data;
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? 'Unable to load labels. Please try again.'
        : 'Unable to load labels. Please try again.';
      error.value = message;
      console.error('Failed to fetch labels:', err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchLabel(id: number | string) {
    labelLoading.value = true;
    labelError.value = null;
    label.value = null;

    try {
      const { data } = await axios.get<LabelResponse>(`/labels/${id}`);
      label.value = data.data;
      return data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 404) {
          labelError.value = 'Label not found.';
        } else if (err.response?.status === 403) {
          labelError.value = 'You do not have access to this label.';
        } else {
          labelError.value = 'Unable to load label. Please try again.';
        }
      } else {
        labelError.value = 'Label not found.';
      }
      console.error('Failed to fetch label:', err);
      throw err;
    } finally {
      labelLoading.value = false;
    }
  }

  async function createLabel(payload: CreateLabelPayload) {
    try {
      const { data } = await axios.post<LabelResponse>('/labels', payload);

      if (data.data) {
        labels.value = [data.data, ...labels.value];
      }

      return data;
    } catch (err: unknown) {
      console.error('Failed to create label:', err);
      throw err;
    }
  }

  async function updateLabel(id: number | string, payload: UpdateLabelPayload) {
    try {
      const { data } = await axios.put<LabelResponse>(`/labels/${id}`, payload);

      if (data.data) {
        const index = labels.value.findIndex((l: Label) => l.id === Number(id));
        if (index !== -1) {
          labels.value[index] = data.data;
        }
        if (label.value?.id === Number(id)) {
          label.value = data.data;
        }
      }

      return data;
    } catch (err: unknown) {
      console.error('Failed to update label:', err);
      throw err;
    }
  }

  async function deleteLabel(id: number | string) {
    try {
      const { data } = await axios.delete<DeleteResponse>(`/labels/${id}`);

      labels.value = labels.value.filter((l: Label) => l.id !== Number(id));
      if (label.value?.id === Number(id)) {
        label.value = null;
      }

      return data;
    } catch (err: unknown) {
      console.error('Failed to delete label:', err);
      throw err;
    }
  }

  function clearState() {
    labels.value = [];
    isLoading.value = false;
    error.value = null;
    label.value = null;
    labelLoading.value = false;
    labelError.value = null;
  }

  return {
    labels,
    isLoading,
    error,

    label,
    labelLoading,
    labelError,

    fetchLabels,
    fetchLabel,
    createLabel,
    updateLabel,
    deleteLabel,

    clearState
  };
};
