import axios from "axios"

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
      const { data: user } = await axios.get<User>('/user');

      return {
        ...user,
        email_verified_at: user.email_verified_at ? new Date(user.email_verified_at) : null,
        two_factor_confirmed_at: user.two_factor_confirmed_at ? new Date(user.two_factor_confirmed_at) : null,
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at)
      };
    } catch (error) {
      return null;
    }
  }

  async function initUser() {
    user.value = await getUser();
  }

  async function login(credentials: LoginCredentials) {
    try {
      const response = await axios.post<User>('/login', credentials);
      if (import.meta.client && window.history.length > 1) {
        router.back();
      } else {
        await router.push('/me');
      }
    } catch (error) {
      throw error;
    }
  }

  async function register(credentials: RegisterCredentials) {
    try {
      console.log('register');
      const response = await axios.post<User>('/register', credentials);

      await login({
        email: credentials.email,
        password: credentials.password
      });

      await router.push('/me');
    } catch (error) {
      throw error;
    }
  }

  async function logout() {
    try {
      await axios.post('/logout');
      user.value = null;
      await router.replace('/login');
    } catch (error) {
      throw error;
    }
  }

  return {
    login,
    logout,
    register,
    initUser,
    user
  }
}
