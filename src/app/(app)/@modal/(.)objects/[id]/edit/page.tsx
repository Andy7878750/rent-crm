import { Modal } from '../../../../modal';
import Page from '../../../../objects/[id]/edit/page';

export default function EditObjectModal(props: PageProps<'/objects/[id]/edit'>) {
  return <Modal><Page {...props} /></Modal>;
}
