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
      prerelease: '',
      noVerify: true,
      skipChangelog: false,
    },
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogVersion, setDialogVersion] = useState('');
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

  const calculateNewVersion = (currentVersion: string) => {
    const versionParts = currentVersion.split('-');

    let [major, minor, patch] = versionParts[0].split('.').map(Number);

    // Verificando o tipo de versão selecionado e ajustando a nova versão
    if (parameters.newVersionType === 'major') {
      major += 1;
      minor = 0;
      patch = 0;
    } else if (parameters.newVersionType === 'minor') {
      minor += 1;
      patch = 0;
    } else if (parameters.newVersionType === 'patch') {
      patch += 1;
    } else if (
      parameters.newVersionType !== 'major' &&
      parameters.newVersionType !== 'minor' &&
      parameters.newVersionType !== 'patch'
    ) {
      if (parameters?.options?.prerelease) {
        return parameters.newVersionType + `-${parameters.options.prerelease}`;
      }
      return parameters.newVersionType;
    }

    // Montando a nova versão
    let newVersion = `${major}.${minor}.${patch}`;

    // Se houver pré-release, adiciona ao final
    if (parameters?.options?.prerelease) {
      return newVersion + `-${parameters.options.prerelease}`;
    }

    return newVersion;
  };

  return (
    <Card className="h-full">
      <CardFooter className="flex flex-col gap-4 items-start p-5 ">
        <Button onClick={ipcHandle}>Selecionar Pasta e Gerar Changelog</Button>
        <div className="flex flex-col gap-2">
          {data.length === 0 ? (
            <Label>Nenhum dado inserido.</Label>
          ) : (
            data.map((item) => (
              <motion.div key={item.localPath} initial={{ x: 0 }}>
                <Card className="p-5 flex flex-col gap-2">
                  <Label className="text-xl">{item.name}</Label>
                  <Label className="text-muted-foreground text-sm">
                    {item.localPath}
                  </Label>
                  <CardFooter>
                    <Dialog
                      open={dialogOpen}
                      onOpenChange={async (open) => {
                        if (open) {
                          const version =
                            await window.electron.ipcRenderer.invoke(
                              'get-project-version',
                              item.localPath,
                            );
                          if (version.success) {
                            setDialogVersion(version);
                          } else {
                            setDialogVersion('1.1.0');
                          }
                          console.log(version);
                          setDialogOpen(true);
                        } else {
                          setDialogOpen(false);
                          setDialogVersion('');
                          setParameters({
                            newVersionType: 'major',
                            workingDirectory: '',
                            options: {
                              firstRelease: false,
                              prerelease: '',
                              noVerify: true,
                              skipChangelog: false,
                            },
                          });
                        }
                      }}
                    >
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
                          <div className="flex gap-2">
                            <Label>Versão atual: </Label>
                            <Label className="text-muted-foreground font-normal">
                              {dialogVersion}
                            </Label>
                          </div>
                          <div className="flex gap-2">
                            <Label>Nova Versão: </Label>
                            <Label className="text-muted-foreground font-normal">
                              {calculateNewVersion(dialogVersion)}
                            </Label>
                          </div>
                          <Label>Selecione o tipo de versão</Label>
                          <RadioGroup
                            value={parameters.newVersionType}
                            onValueChange={(value: string) => {
                              setParameters((prev) => {
                                const newValue = {
                                  ...prev,
                                  newVersionType: value,
                                };
                                return newValue;
                              });
                            }}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="minor" id="r1" />
                              <div className="flex gap-2">
                                <Label htmlFor="r1">Minor</Label>
                                <Label htmlFor="r1" className="text-muted">
                                  1.x.x
                                </Label>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="patch" id="r1" />
                              <div className="flex gap-2">
                                <Label htmlFor="r1">Patch</Label>
                                <Label htmlFor="r1" className="text-muted">
                                  x.x.1
                                </Label>
                              </div>
                            </div>
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
                              <RadioGroupItem
                                value="custom"
                                id="r3"
                                checked={
                                  parameters.newVersionType !== 'major' &&
                                  parameters.newVersionType !== 'minor' &&
                                  parameters.newVersionType !== 'patch'
                                }
                              />
                              <div className="flex flex-col gap-2">
                                <Label htmlFor="r3">Personalizado</Label>
                                {parameters.newVersionType !== 'major' &&
                                  parameters.newVersionType !== 'minor' &&
                                  parameters.newVersionType !== 'patch' && (
                                    <Input
                                      className="w-full"
                                      placeholder="Digite aqui a versão"
                                      onChange={(e) => {
                                        setParameters((prev) => {
                                          const newValue: RunReleaseScriptParams =
                                            {
                                              ...prev,
                                              newVersionType: e.target.value,
                                            };
                                          return newValue;
                                        });
                                      }}
                                    />
                                  )}
                              </div>
                            </div>
                          </RadioGroup>
                        </div>
                        <div className="flex flex-col gap-2 items-start ">
                          <div className="flex items-center gap-2">
                            <Switch
                              id="pre-release"
                              checked={!!parameters.options?.prerelease}
                              onCheckedChange={(value) => {
                                setParameters((prev) => {
                                  const newValue: RunReleaseScriptParams = {
                                    ...prev,
                                    options: {
                                      ...prev.options,
                                      prerelease: value ? 'alpha' : '',
                                    },
                                  };
                                  return newValue;
                                });
                              }}
                            />
                            <Label htmlFor="pre-release">Pré Release</Label>
                          </div>
                          {parameters.options?.prerelease && (
                            <RadioGroup
                              value={parameters.options.prerelease}
                              onValueChange={(value: string) => {
                                setParameters((prev) => {
                                  const newValue: RunReleaseScriptParams = {
                                    ...prev,
                                    options: {
                                      ...prev.options,
                                      prerelease: value,
                                    },
                                  };
                                  return newValue;
                                });
                              }}
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="alpha" id="r2" />
                                <div className="flex gap-2">
                                  <Label htmlFor="r1">Alpha</Label>
                                  <Label htmlFor="r1" className="text-muted">
                                    x.1.x
                                  </Label>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="beta" id="r1" />
                                <div className="flex gap-2">
                                  <Label htmlFor="r1">Beta</Label>
                                  <Label htmlFor="r1" className="text-muted">
                                    1.x.x
                                  </Label>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value="custom"
                                  checked={
                                    parameters.options.prerelease !== 'beta' &&
                                    parameters.options.prerelease !== 'alpha'
                                  }
                                  id="r3"
                                />
                                <div className="flex flex-col gap-2">
                                  <Label htmlFor="r3">Personalizado</Label>
                                  {parameters.options.prerelease !== 'beta' &&
                                    parameters.options.prerelease !==
                                      'alpha' && (
                                      <Input
                                        className="w-full"
                                        placeholder="Digite aqui a pré release"
                                        onChange={(e) => {
                                          setParameters((prev) => {
                                            const newValue: RunReleaseScriptParams =
                                              {
                                                ...prev,
                                                options: {
                                                  ...prev.options,
                                                  prerelease: e.target.value,
                                                },
                                              };
                                            return newValue;
                                          });
                                        }}
                                      />
                                    )}
                                </div>
                              </div>
                            </RadioGroup>
                          )}
                        </div>
                        <Button
                          onClick={() => {
                            handleAddNewVersion({
                              newVersionType: parameters.newVersionType,
                              workingDirectory: item.localPath,
                              options: parameters.options,
                            });
                            setDialogOpen(false);
                          }}
                        >
                          Adicionar nova versão
                        </Button>
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
