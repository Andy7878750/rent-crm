import { Modal } from '../../../modal';
import Page from '../../../tariffs/[id]/page';

export default function EditServiceModal(props: PageProps<'/tariffs/[id]'>) {
  return <Modal wide><Page {...props} /></Modal>;
}
