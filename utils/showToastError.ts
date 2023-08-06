export const showToastError = (e: unknown) => {
  const { init } = useToast();
  init({
    message: typeof e === 'string' ? e : (e as Error).message,
    color: 'danger',
  });
};
