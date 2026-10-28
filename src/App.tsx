import { RouterProvider } from "react-router-dom"
import { useRecoilState } from "recoil"
import ConfirmModal from "./components/modal/ConfirmModal/ConfirmModal"
import { modalState } from "./recoil/modal/modal"
import router from "./router"

export default function App() {
  const [modal] = useRecoilState(modalState)
  return (
    <>
      {modal.isOpenModal && <ConfirmModal />}
      <RouterProvider router={router} />
    </>
  )
}
