import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { orderId } = ctx.params || {};
  return {
    redirect: {
      destination: `/marketplace/orders/${orderId}`,
      permanent: true,
    },
  };
};

export default function OrderRedirect() {
  return null;
}
