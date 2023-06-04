export function download(url: string, filename?: string) {
  const a = document.createElement('a')
  a.href = url
  if (filename) a.download = filename
  a.click()
}
