export function resolvePadding(styles: Record<string, string>) {
  if (styles.padding) return styles.padding;
  if (styles.paddingTop || styles.paddingRight || styles.paddingBottom || styles.paddingLeft) {
    const top = styles.paddingTop || '0px';
    const right = styles.paddingRight || top;
    const bottom = styles.paddingBottom || top;
    const left = styles.paddingLeft || right;
    return `${top} ${right} ${bottom} ${left}`;
  }
  return undefined;
}

export function resolveMargin(styles: Record<string, string>) {
  if (styles.margin) return styles.margin;
  if (styles.marginY || styles.marginX) {
    const y = styles.marginY || '0px';
    const x = styles.marginX || '0px';
    return `${y} ${x}`;
  }
  if (styles.marginTop || styles.marginRight || styles.marginBottom || styles.marginLeft) {
    const top = styles.marginTop || '0px';
    const right = styles.marginRight || top;
    const bottom = styles.marginBottom || top;
    const left = styles.marginLeft || right;
    return `${top} ${right} ${bottom} ${left}`;
  }
  return undefined;
}

export function resolveBlockAlign(styles: Record<string, string>) {
  const align = styles.blockAlign || 'left';
  if (align === 'center') return { marginLeft: 'auto', marginRight: 'auto' };
  if (align === 'right') return { marginLeft: 'auto', marginRight: '0' };
  return { marginLeft: '0', marginRight: 'auto' };
}
