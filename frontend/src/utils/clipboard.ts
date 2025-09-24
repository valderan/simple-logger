export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    console.error('Clipboard API copy failed', error);
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();

  let successful = false;
  try {
    successful = document.execCommand('copy');
  } catch (error) {
    console.error('Fallback copy failed', error);
  }
  document.body.removeChild(textarea);

  return successful;
};
