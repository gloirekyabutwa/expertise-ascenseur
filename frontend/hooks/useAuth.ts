import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { LoginResponseSchema, UserSchema } from '@/lib/api/types';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

export const useAuth = () => {
    const queryClient = useQueryClient();
    const router = useRouter();

    // Fetch current user
    const { data: user, isLoading, isError } = useQuery({
        queryKey: ['me'],
        queryFn: async () => {
            const response = await apiClient.get('/users/me');
            return UserSchema.parse(response.data);
        },
        retry: false,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Login Mutation
    const loginMutation = useMutation({
        mutationFn: async (credentials: any) => {
            // Backend expects OAuth2 form data usually, or JSON?
            // "email + password"
            // Fastapi OAuth2PasswordRequestForm expects form-data: username, password
            const formData = new URLSearchParams();
            formData.append('username', credentials.email);
            formData.append('password', credentials.password);

            const response = await apiClient.post('/auth/login', formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            return LoginResponseSchema.parse(response.data);
        },
        onSuccess: (data) => {
            // Store token
            if (typeof window !== 'undefined') {
                localStorage.setItem('access_token', data.access_token);
            }
            queryClient.invalidateQueries({ queryKey: ['me'] });
        },
    });

    const logout = () => {
        localStorage.removeItem('access_token');
        queryClient.setQueryData(['me'], null);
        router.push('/login');
    };

    return {
        user,
        isLoading,
        isAuthenticated: !!user,
        login: loginMutation.mutateAsync,
        isLoggingIn: loginMutation.isPending,
        logout,
    };
};
