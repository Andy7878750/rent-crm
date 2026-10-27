import { Modal } from '../../../../modal';
import Page from '../../../../objects/[id]/receipt/page';

export default function ReceiptModal(props: PageProps<'/objects/[id]/receipt'>) {
  return <Modal xl><Page {...props} /></Modal>;
}
