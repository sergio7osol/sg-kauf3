import axios from 'axios';

export const useUser = () => {
  const user = useState<{ name?: string, email?: string, avatar?: { src: string, alt: string } } | null>('user', () => null);
  const loading = useState('userLoading', () => false);
  const error = useState('userError', () => null as Error | null);

  const fetchUser = async () => {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await axios.get('/user');
      user.value = data;
    } catch (err) {
      error.value = err as Error;
      console.error('Failed to fetch user profile', err);
    } finally {
      loading.value = false;
    }
  };

  return {
    user: readonly(user),
    loading: readonly(loading),
    error: readonly(error),
    fetchUser
  };
};
