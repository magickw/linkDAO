import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: '/marketplace/orders',
    permanent: true,
  },
});

export default function OrdersRedirect() {
  return null;
}
