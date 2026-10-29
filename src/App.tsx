import { Component, ReactNode, Suspense } from "react"
import { RouterProvider } from "react-router-dom"
import Loading from "@/components/shared/Loading"
import { Button } from "@/components/ui/button"
import router from "./router"
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed)
      return (
        <main className="mx-auto max-w-lg p-12 text-center">
          <h1 className="page-title">화면을 불러오지 못했어요</h1>
          <p className="page-description">
            연결을 확인하고 다시 시도해 주세요.
          </p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            다시 불러오기
          </Button>
        </main>
      )
    return this.props.children
  }
}
export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <RouterProvider router={router} />
      </Suspense>
    </ErrorBoundary>
  )
}
