import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { CreationListPage } from '@/pages/CreationListPage'
import { CharacterFormPage } from '@/pages/CharacterFormPage'
import { RequireAuth } from '@/features/auth/RequireAuth'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <CreationListPage />
      </RequireAuth>
    ),
  },
  {
    path: '/character/:id',
    element: (
      <RequireAuth>
        <CharacterFormPage />
      </RequireAuth>
    ),
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
