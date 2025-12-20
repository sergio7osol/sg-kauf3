import axios from 'axios'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  name?: string
}

export interface User {
  email: string
  email_verified_at?: Date | null
  id: number
  name: string
  two_factor_confirmed_at?: Date | null
  two_factor_recovery_codes?: string | null
  two_factor_secret?: string | null
  updated_at: Date
  remember_token?: string | null
  created_at: Date
}

const user = ref<User | null>(null);

export const useAuth = () => {
  const router = useRouter();

  async function getUser(): Promise<User | null> {
    if (user.value) return user.value;

    try {
      const { data: fetchedUser } = await axios.get<User>('/user');

      return {
        ...fetchedUser,
        email_verified_at: fetchedUser.email_verified_at ? new Date(fetchedUser.email_verified_at) : null,
        two_factor_confirmed_at: fetchedUser.two_factor_confirmed_at ? new Date(fetchedUser.two_factor_confirmed_at) : null,
        created_at: new Date(fetchedUser.created_at),
        updated_at: new Date(fetchedUser.updated_at)
      };
    } catch {
      return null;
    }
  }

  async function initUser() {
    user.value = await getUser();
  }

  async function login(credentials: LoginCredentials) {
    await axios.post<User>('/login', credentials);

    if (import.meta.client && window.history.length > 1) {
      router.back();
    } else {
      await router.push('/me');
    }
  }

  async function register(credentials: RegisterCredentials) {
    await axios.post<User>('/register', credentials);

    await login({
      email: credentials.email,
      password: credentials.password
    });

    await router.push('/me');
  }

  async function logout() {
    await axios.post('/logout');
    user.value = null;
    await router.replace('/login');
  }

  return {
    login,
    logout,
    register,
    initUser,
    user
  };
};
