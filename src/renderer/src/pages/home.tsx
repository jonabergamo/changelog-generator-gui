import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardFooter } from '@renderer/components/ui/card'
import { useState, useEffect } from 'react'
import { Label } from '../components/ui/label'
import toast from 'react-hot-toast'
import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'

interface UserProject {
  name: string
  localPath: string
  changelogName: string
}

export function Home() {
  const [data, setData] = useState<UserProject[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedData: UserProject[] = await window.electron.ipcRenderer.invoke('get-projects')
        console.log(storedData)
        setData(storedData)
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      }
    }
    loadData() // Carrega dados quando o componente é montado
  }, [])

  const ipcHandle = async (): Promise<void> => {
    try {
      const result = await window.electron.ipcRenderer.invoke('select-folder')

      if (result.canceled) {
        // Aqui você pode exibir uma mensagem ou simplesmente não fazer nada
        console.log('Seleção de pasta cancelada.')
        return // Sai da função se a seleção foi cancelada
      }
      // Se a seleção não foi cancelada, prossegue com o toast
      toast.promise(
        Promise.resolve(result), // Utiliza a promise resultante
        {
          loading: 'Abrindo',
          success: <b>Projeto adicionado!</b>,
          error: <b>Não foi possível adicionar um novo projeto.</b>
        }
      )

      const folderPath = result.selectedPath
      const folderName = folderPath.split('/').pop().split('\\').pop()
      const newProject: UserProject = {
        name: folderName,
        localPath: folderPath,
        changelogName: 'teste'
      }

      // Atualiza o estado com o novo projeto
      setData((prevData) => [...prevData, newProject])

      // Chama a função para salvar no banco de dados
      await window.electron.ipcRenderer.invoke('set-projects', newProject)

      await toast.promise(window.electron.ipcRenderer.invoke('generate-changelog', folderPath), {
        loading: 'Gerando changelog...',
        success: <b>Changelog gerado com sucesso!</b>,
        error: <b>Não foi possível um changelog para o projeto.</b>
      })
    } catch (error) {
      toast.error('Não foi possivel adicionar o projeto.')
    }
  }
  return (
    <Card className="h-full">
      <CardFooter className="flex flex-col gap-4 items-start p-5 ">
        <Button onClick={ipcHandle}>Selecionar Pasta e Gerar Changelog</Button>
        <div className="flex flex-col gap-2">
          {data.length === 0 ? (
            <Label>Nenhum dado inserido.</Label>
          ) : (
            data.map((item, index) => (
              <motion.div initial={{ x: 0 }} whileHover={{ x: 30 }}>
                <Card key={index} className="p-5 flex flex-col gap-2">
                  <Label className="text-xl">{item.name}</Label>
                  <Label className="text-muted-foreground text-sm">{item.localPath}</Label>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
