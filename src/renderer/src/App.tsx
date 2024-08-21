import { Button } from '@renderer/components/ui/button'
import { Card, CardFooter, CardHeader, CardTitle } from '@renderer/components/ui/card'

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
    <Card>
      <CardHeader>
        <CardTitle>Teste</CardTitle>
      </CardHeader>
      <CardFooter>
        <Button onClick={ipcHandle}>Selecionar Pasta e Gerar Changelog</Button>
      </CardFooter>
    </Card>
  )
}

export default App
