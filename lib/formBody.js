// EPG wants one comma-separated features value, not repeated form keys.
export const encodeFormBody = (body) => {
  const params = new URLSearchParams();
  Object.entries(body).forEach(([key, value]) => {
    const encoded = Array.isArray(value)
      ? value.filter((item) => item !== undefined && item !== null && item !== '').join(',')
      : value;
    if (encoded !== undefined && encoded !== null && encoded !== '') {
      params.append(key, String(encoded));
    }
  });
  return params.toString();
};
