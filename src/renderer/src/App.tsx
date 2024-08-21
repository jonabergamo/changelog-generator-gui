function App(): JSX.Element {
  const ipcHandle = async (): Promise<void> => {
    const result = await window.electron.ipcRenderer.invoke('select-folder-and-generate-changelog')

    if (result.canceled) {
      console.log('Seleção de pasta cancelada.')
    } else if (result.success) {
      console.log('Changelog gerado com sucesso:', result.output)
    } else {
      console.error('Erro ao gerar changelog:', result.error)
    }
  }

  return (
    <div>
      <button className="text-red-500" onClick={ipcHandle}>
        Selecionar Pasta e Gerar Changelog
      </button>
    </div>
  )
}

export default App
