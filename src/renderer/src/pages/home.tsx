import { Button } from '@renderer/components/ui/button';
import { Card, CardContent, CardFooter } from '@renderer/components/ui/card';
import { useState, useEffect } from 'react';
import { Label } from '../components/ui/label';
import toast from 'react-hot-toast';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from '@renderer/components/ui/dialog';
import { Switch } from '@renderer/components/ui/switch';
import { RunReleaseScriptParams } from '@renderer/types';
import {
  RadioGroup,
  RadioGroupItem,
} from '@renderer/components/ui/radio-group';
import { DialogTitle } from '@radix-ui/react-dialog';
import { Input } from '@renderer/components/ui/input';

interface UserProject {
  name: string;
  localPath: string;
  changelogName: string;
}

export function Home() {
  const [data, setData] = useState<UserProject[]>([]);
  const [parameters, setParameters] = useState<RunReleaseScriptParams>({
    newVersionType: 'major',
    workingDirectory: '',
    options: {
      firstRelease: false,
      prerelease: false,
      noVerify: true,
      skipChangelog: false,
    },
  });
  const { setTheme } = useTheme();
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedData: UserProject[] =
          await window.electron.ipcRenderer.invoke('get-projects');
        console.log(storedData);
        setData(storedData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };
    loadData(); // Carrega dados quando o componente é montado
  }, []);

  const ipcHandle = async (): Promise<void> => {
    try {
      const result = await window.electron.ipcRenderer.invoke('select-folder');

      if (result.canceled) {
        // Aqui você pode exibir uma mensagem ou simplesmente não fazer nada
        console.log('Seleção de pasta cancelada.');
        return; // Sai da função se a seleção foi cancelada
      }
      // Se a seleção não foi cancelada, prossegue com o toast
      toast.promise(
        Promise.resolve(result), // Utiliza a promise resultante
        {
          loading: 'Abrindo',
          success: <b>Projeto adicionado!</b>,
          error: <b>Não foi possível adicionar um novo projeto.</b>,
        },
      );

      const folderPath = result.selectedPath;
      const folderName = folderPath.split('/').pop().split('\\').pop();
      const newProject: UserProject = {
        name: folderName,
        localPath: folderPath,
        changelogName: 'teste',
      };

      // Atualiza o estado com o novo projeto
      setData((prevData) => [...prevData, newProject]);

      // Chama a função para salvar no banco de dados
      await window.electron.ipcRenderer.invoke('set-projects', newProject);

      await toast.promise(
        window.electron.ipcRenderer.invoke('run-release-script', {
          newVersionType: 'minor',
          developBranch: 'develop',
          mainBranch: 'master',
          prefix: 'release/',
          workingDirectory: folderPath,
        }),
        {
          loading: 'Gerando changelog...',
          success: <b>Changelog gerado com sucesso!</b>,
          error: <b>Não foi possível um changelog para o projeto.</b>,
        },
      );
    } catch (error) {
      toast.error('Não foi possivel adicionar o projeto.');
    }
  };

  const handleAddNewVersion = async (params: RunReleaseScriptParams) => {
    await toast.promise(
      window.electron.ipcRenderer.invoke('run-release-script', params),
      {
        loading: 'Adicionando nova versão...',
        success: 'Nova versão adicionada',
        error: 'Erro ao adicionar nova versão',
      },
    );
  };

  return (
    <Card className="h-full">
      <CardFooter className="flex flex-col gap-4 items-start p-5 ">
        <Button onClick={ipcHandle}>Selecionar Pasta e Gerar Changelog</Button>
        <div className="flex flex-col gap-2">
          {data.length === 0 ? (
            <Label>Nenhum dado inserido.</Label>
          ) : (
            data.map((item, index) => (
              <motion.div key={index} initial={{ x: 0 }}>
                <Card className="p-5 flex flex-col gap-2">
                  <Label className="text-xl">{item.name}</Label>
                  <Label className="text-muted-foreground text-sm">
                    {item.localPath}
                  </Label>
                  <CardFooter>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>Adicionar nova versão</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-medium">
                            Adicionar nova versão
                          </DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col gap-3">
                          <div className="flex gap-2">
                            <Label>Projeto: </Label>
                            <Label className="text-muted-foreground font-normal">
                              {item.name}
                            </Label>
                          </div>
                          <Label>Selecione o tipo de versão</Label>
                          <RadioGroup
                            value={parameters.newVersionType}
                            onValueChange={(value: string) => {
                              setParameters((prev) => {
                                var newValue = {
                                  ...prev,
                                  newVersionType: value,
                                };
                                return newValue;
                              });
                            }}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="major" id="r2" />
                              <div className="flex gap-2">
                                <Label htmlFor="r1">Major</Label>
                                <Label htmlFor="r1" className="text-muted">
                                  x.1.x
                                </Label>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="minor" id="r1" />
                              <div className="flex gap-2">
                                <Label htmlFor="r1">Major</Label>
                                <Label htmlFor="r1" className="text-muted">
                                  1.x.x
                                </Label>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="custom" id="r3" />
                              <div className="flex flex-col gap-2">
                                <Label htmlFor="r3">Personalizado</Label>
                                {parameters.newVersionType === 'custom' && (
                                  <Input
                                    className="w-full"
                                    placeholder="Digite aqui a versão"
                                  />
                                )}
                              </div>
                            </div>
                          </RadioGroup>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="airplane-mode" />
                          <Label htmlFor="airplane-mode">Pré Release</Label>
                        </div>
                        <Button>Adicionar nova versão</Button>
                      </DialogContent>
                    </Dialog>
                  </CardFooter>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

// onClick={() => handleAddNewVersion(item.localPath)}
