import { Modal } from 'antd'
import type { ReactNode } from 'react'

interface ConfirmModalProps {
  open: boolean
  title: string
  description?: ReactNode
  confirmText?: string
  cancelText?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      centered
      okText={confirmText}
      cancelText={cancelText}
      confirmLoading={loading}
      okButtonProps={{ danger }}
      onOk={onConfirm}
      onCancel={onCancel}
    >
      {description && <div className="confirm-modal__body">{description}</div>}
    </Modal>
  )
}
