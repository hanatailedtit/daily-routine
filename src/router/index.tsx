import { createBrowserRouter, Navigate } from "react-router-dom"
import Landing from "@/pages/landing/Landing"
import TodoPage from "@/pages/todo-page/TodoPage"
import MyPage from "@/pages/my-page/MyPage"
import SignUp from "@/pages/sign-up/SignUp"
import DefaultLayout from "@/components/layout/DefaultLayout/DefaultLayout"
const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  {
    element: <DefaultLayout />,
    children: [
      { path: "/sign-up", element: <SignUp /> },
      { path: "/todo-page", element: <TodoPage /> },
      { path: "/my-page", element: <MyPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
])

export default router
