import { Button } from '@renderer/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import { useState, useEffect } from 'react';
import { Label } from '../components/ui/label';
import toast from 'react-hot-toast';
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
import semver from 'semver';
import { IoMdAdd, IoMdOpen } from 'react-icons/io';
import { GiUpgrade } from 'react-icons/gi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { VscVscode } from 'react-icons/vsc';
import { CiBookmarkRemove } from 'react-icons/ci';

import { Badge } from '@renderer/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@renderer/components/ui/tooltip';
import { BiSolidSpreadsheet } from 'react-icons/bi';

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
    shouldBuild: false,
    buildCommand: '',
    uploadDirectory: '.',
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogVersion, setDialogVersion] = useState<CurrentVersion | null>(
    null,
  );
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [changelogDialogOpen, setChangelogDialogOpen] = useState(false);

  // Manipula cliques em links
  const handleLinkClick = (
    event: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
  ) => {
    event.preventDefault();
    const url = event.currentTarget.href;
    window.electron.ipcRenderer.invoke('open-link', url);
  };

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

  interface CurrentVersion {
    success?: boolean;
    version: string;
  }

  const calculateNewVersion = (version: string | null): string => {
    console.log(version);
    if (!version || typeof version !== 'string') {
      return '';
    }

    // Remove 'v' prefix if present
    let parsedVersion = version.startsWith('v') ? version.slice(1) : version;

    // Validate the version string
    if (!semver.valid(parsedVersion)) {
      throw new Error(
        `Invalid version format: ${version}. Expected format: major.minor.patch, e.g., v1.0.0 or 1.0.0`,
      );
    }

    let newVersion: string;

    switch (parameters.newVersionType) {
      case 'major':
      case 'minor':
      case 'patch':
        newVersion = semver.inc(parsedVersion, parameters.newVersionType)!;
        break;
      default:
        // Handle custom version strings or prereleases
        if (semver.valid(parameters.newVersionType)) {
          newVersion = parameters.newVersionType;
        } else if (parameters.options?.prerelease) {
          newVersion = semver.inc(
            parsedVersion,
            'prerelease',
            parameters.options.prerelease,
          )!;
          if (!newVersion) {
            throw new Error('Failed to calculate prerelease version.');
          }
        } else {
          throw new Error(
            `Invalid newVersionType: ${parameters.newVersionType}. Must be 'major', 'minor', 'patch', a valid version string, or a prerelease identifier.`,
          );
        }
        break;
    }

    return newVersion;
  };

  const loadChangelog = async (project: any) => {
    try {
      const changelogContent = await window.electron.ipcRenderer.invoke(
        'read-changelog',
        project.localPath,
      );

      setSelectedProject({ ...project, changelog: changelogContent });
      setChangelogDialogOpen(true);
    } catch (error) {
      console.error('Erro ao carregar o changelog:', error);
      toast.error('Não foi possível carregar o changelog.');
    }
  };

  return (
    <div className="flex h-full w-full">
      <Card className=" p-0 border-r-2 m-5 gap-2 w-full">
        <CardFooter className="h-[15%] ">
          <Button
            onClick={ipcHandle}
            variant="ghost"
            className="gap-2 text-primary hover:text-primary w-full"
          >
            <IoMdAdd />
            Adicionar Projeto
          </Button>
        </CardFooter>
        <CardContent className="flex flex-col gap-4 items-start  w-full overflow-y-auto h-[85%]">
          {data.length === 0 ? (
            <Label>Nenhum projeto inserido.</Label>
          ) : (
            data.map((item) => (
              <div key={item.localPath} className="w-full">
                <span className="relative flex items-center h-full">
                  <Card className="h-fit w-full flex py-5 flex-col gap-2 bg-black/15 border-l-8 border-primary overflow-hidden">
                    <CardHeader className="py-0">
                      <CardTitle className="flex w-full justify-between items-center">
                        <Label className="text-xl">{item.name}</Label>
                      </CardTitle>
                      <Label className="text-muted-foreground text-sm">
                        {item.localPath}
                      </Label>
                    </CardHeader>
                    <CardFooter className="flex items-center justify-end gap-2 py-0">
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger>
                          <Button
                            onClick={() => loadChangelog(item)}
                            variant="outline"
                            className=" text-2xl flex hover:text-primary  p-3 h-full justify-center items-center"
                          >
                            <BiSolidSpreadsheet />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Detalhes</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip delayDuration={0}>
                        <TooltipTrigger>
                          <Dialog
                            open={dialogOpen}
                            onOpenChange={async (open) => {
                              if (open) {
                                const version =
                                  await window.electron.ipcRenderer.invoke(
                                    'get-project-version',
                                    item.localPath,
                                  );
                                if (version.success && version.version) {
                                  setDialogVersion({
                                    version: version.version,
                                  });
                                } else {
                                  setDialogVersion({ version: '1.1.0' });
                                }
                                console.log(version);
                                setDialogOpen(true);
                              } else {
                                setDialogOpen(false);
                                setDialogVersion(null);
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
                              <Button
                                variant="outline"
                                className=" text-2xl flex hover:text-primary p-3 h-full justify-center items-center"
                              >
                                <GiUpgrade />
                              </Button>
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
                                    {dialogVersion?.version}
                                  </Label>
                                </div>
                                <div className="flex gap-2">
                                  <Label>Nova Versão: </Label>
                                  <Label className="text-muted-foreground font-normal">
                                    v
                                    {calculateNewVersion(
                                      dialogVersion?.version ?? null,
                                    )}
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
                                      <Label
                                        htmlFor="r1"
                                        className="text-muted"
                                      >
                                        1.x.x
                                      </Label>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="patch" id="r1" />
                                    <div className="flex gap-2">
                                      <Label htmlFor="r1">Patch</Label>
                                      <Label
                                        htmlFor="r1"
                                        className="text-muted"
                                      >
                                        x.x.1
                                      </Label>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="major" id="r2" />
                                    <div className="flex gap-2">
                                      <Label htmlFor="r1">Major</Label>
                                      <Label
                                        htmlFor="r1"
                                        className="text-muted"
                                      >
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
                                        parameters.newVersionType !==
                                          'patch' && (
                                          <Input
                                            className="w-full"
                                            placeholder="Digite aqui a versão"
                                            onChange={(e) => {
                                              setParameters((prev) => {
                                                const newValue: RunReleaseScriptParams =
                                                  {
                                                    ...prev,
                                                    newVersionType:
                                                      e.target.value,
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
                                        const newValue: RunReleaseScriptParams =
                                          {
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
                                  <Label htmlFor="pre-release">
                                    Pré Release
                                  </Label>
                                </div>
                                {parameters.options?.prerelease && (
                                  <RadioGroup
                                    value={parameters.options.prerelease}
                                    onValueChange={(value: string) => {
                                      setParameters((prev) => {
                                        const newValue: RunReleaseScriptParams =
                                          {
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
                                        <Label
                                          htmlFor="r1"
                                          className="text-muted"
                                        >
                                          x.1.x
                                        </Label>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="beta" id="r1" />
                                      <div className="flex gap-2">
                                        <Label htmlFor="r1">Beta</Label>
                                        <Label
                                          htmlFor="r1"
                                          className="text-muted"
                                        >
                                          1.x.x
                                        </Label>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem
                                        value="custom"
                                        checked={
                                          parameters.options.prerelease !==
                                            'beta' &&
                                          parameters.options.prerelease !==
                                            'alpha'
                                        }
                                        id="r3"
                                      />
                                      <div className="flex flex-col gap-2">
                                        <Label htmlFor="r3">
                                          Personalizado
                                        </Label>
                                        {parameters.options.prerelease !==
                                          'beta' &&
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
                                                        prerelease:
                                                          e.target.value,
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

                              <div className="flex flex-col gap-2 items-start ">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    id="pre-release"
                                    checked={!!parameters.shouldBuild}
                                    onCheckedChange={(value) => {
                                      setParameters((prev) => {
                                        const newValue: RunReleaseScriptParams =
                                          {
                                            ...prev,
                                            shouldBuild: value,
                                          };
                                        return newValue;
                                      });
                                    }}
                                  />
                                  <span className="flex items-center gap-2">
                                    <Label htmlFor="pre-release">Build</Label>
                                    <Badge>BETA</Badge>
                                  </span>

                                  {parameters.shouldBuild && (
                                    <>
                                      <Input
                                        value={parameters.buildCommand}
                                        placeholder="Comando build"
                                        onChange={(e) => {
                                          setParameters((prev) => {
                                            const newValue: RunReleaseScriptParams =
                                              {
                                                ...prev,
                                                buildCommand: e.target.value,
                                              };
                                            return newValue;
                                          });
                                        }}
                                      />
                                      <Input
                                        placeholder="Diretório de build"
                                        value={parameters.uploadDirectory}
                                        onChange={(e) => {
                                          setParameters((prev) => {
                                            const newValue: RunReleaseScriptParams =
                                              {
                                                ...prev,
                                                uploadDirectory: e.target.value,
                                              };
                                            return newValue;
                                          });
                                        }}
                                      />
                                    </>
                                  )}
                                </div>
                              </div>
                              <Button
                                onClick={() => {
                                  handleAddNewVersion({
                                    newVersionType: parameters.newVersionType,
                                    workingDirectory: item.localPath,
                                    options: parameters.options,
                                    shouldBuild: parameters.shouldBuild,
                                    buildCommand: parameters.buildCommand,
                                    uploadDirectory: parameters.uploadDirectory,
                                  });
                                  setDialogOpen(false);
                                }}
                              >
                                Adicionar nova versão
                              </Button>
                            </DialogContent>
                          </Dialog>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Adicionar nova versão</p>
                        </TooltipContent>
                      </Tooltip>
                    </CardFooter>
                  </Card>
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Dialog open={changelogDialogOpen} onOpenChange={setChangelogDialogOpen}>
        <DialogContent className="max-w-5xl w-full">
          <DialogHeader>
            <DialogTitle className="flex w-full justify-between items-center">
              <Label className="text-xl">{selectedProject?.name}</Label>
              <div className="mr-5">
                <Tooltip delayDuration={0}>
                  <TooltipTrigger>
                    <Button
                      className="text-xl text-destructive hover:text-destructive"
                      variant="ghost"
                      onClick={() => {
                        window.electron.ipcRenderer.invoke(
                          'remove-project-by-path',
                          selectedProject.localPath,
                        );
                        setData(
                          data.filter(
                            (proj) =>
                              proj.localPath !== selectedProject.localPath,
                          ),
                        );
                        setChangelogDialogOpen(false);
                      }}
                    >
                      <CiBookmarkRemove />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Desanexar projeto</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger>
                    <Button
                      className="text-xl text-primary hover:text-primary"
                      variant="ghost"
                      onClick={() => {
                        window.electron.ipcRenderer.invoke(
                          'open-changelog-in-explorer',
                          selectedProject?.localPath,
                        );
                      }}
                    >
                      <IoMdOpen />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Abrir no explorador</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger>
                    <Button
                      className="text-xl text-primary hover:text-primary"
                      variant="ghost"
                      onClick={() => {
                        window.electron.ipcRenderer.invoke(
                          'open-project-in-vscode',
                          selectedProject?.localPath,
                        );
                      }}
                    >
                      <VscVscode />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Abrir no Visual Studio Code</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </DialogTitle>
            <Label className="text-muted-foreground text-xs">
              {selectedProject?.localPath}
            </Label>
          </DialogHeader>
          {selectedProject ? (
            <div className="markdown-content overflow-y-auto max-h-[70vh] w-full">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children, ...props }) => (
                    <a
                      {...props}
                      href={href}
                      onClick={(e) => handleLinkClick(e)}
                      style={{ color: 'blue', textDecoration: 'underline' }}
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {selectedProject.changelog}
              </ReactMarkdown>
            </div>
          ) : (
            <Label>Carregando...</Label>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
