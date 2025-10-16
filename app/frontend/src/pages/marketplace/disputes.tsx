import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: '/support/disputes',
    permanent: false,
  },
});

export default function DisputesRedirect() {
  return null;
}
