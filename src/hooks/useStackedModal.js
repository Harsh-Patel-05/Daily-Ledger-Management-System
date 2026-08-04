import { useModal } from '../context/ModalContext';

/** Returns whether this modal type is in the stack and if it's the top modal */
export function useStackedModal(type) {
  const { current, stack, closeModal, openModal } = useModal();
  const entry = [...stack].reverse().find((s) => s.type === type) || null;
  return {
    inStack: !!entry,
    isTop: current?.type === type,
    open: current?.type === type,
    payload: entry?.payload || {},
    closeModal,
    openModal,
  };
}

export default useStackedModal;
