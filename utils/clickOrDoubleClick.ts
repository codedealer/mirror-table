interface Handler {
  (e?: MouseEvent): void
}

const clickOrDoubleClick = (onClick: Handler, onDoubleClick: Handler, delay = 200) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (e: MouseEvent) => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
      onDoubleClick(e);
      return;
    }

    timer = setTimeout(() => {
      timer = undefined;
      onClick(e);
    }, delay);
  };
};

export default clickOrDoubleClick;
