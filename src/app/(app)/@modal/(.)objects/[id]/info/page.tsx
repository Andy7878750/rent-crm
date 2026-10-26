import { Modal } from '../../../../modal';
import Page from '../../../../objects/[id]/info/page';

export default function ObjectInfoModal(props: PageProps<'/objects/[id]/info'>) {
  return <Modal><Page {...props} /></Modal>;
}
