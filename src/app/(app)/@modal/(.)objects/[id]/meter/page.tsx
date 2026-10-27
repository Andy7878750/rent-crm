import { Modal } from '../../../../modal';
import Page from '../../../../objects/[id]/meter/page';

export default function MeterModal(props: PageProps<'/objects/[id]/meter'>) {
  return <Modal><Page {...props} /></Modal>;
}
