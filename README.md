# Pug Planner para instalar a partir do Windows

A aplicação é híbrida. A interface local usa HTML, CSS e JavaScript. Swift e UIKit apresentam essa interface em WKWebView e ligam-na à câmara, à fototeca, ao reconhecimento de texto com Vision, à voz e aos lembretes do iPhone. Para instalar estas funções em conjunto, compila o alvo iOS.

## A. Ficheiros do repositório

```text
.
├── .github/
│   └── workflows/
│       └── build-ipa.yml
├── project.yml
├── README.md
└── App/
    ├── App.swift
    ├── Alarms.swift
    ├── LocalReminders.swift
    ├── PlannerMedia.swift
    ├── SpokenTone.swift
    ├── Info.plist
    ├── reminder_ring.wav
    ├── Assets.xcassets/
    │   ├── Contents.json
    │   └── AppIcon.appiconset/
    │       ├── Contents.json
    │       └── icon.png
    └── Interface/
        ├── index.html
        ├── style.css
        ├── android-style.css
        ├── android.js
        ├── food-license.txt
        ├── pug-launcher.png
        ├── content.js
        ├── model.js
        ├── ui.js
        ├── training.js
        ├── settings.js
        └── pug.png
```

## B e C. Projeto e compilação

O ficheiro `project.yml` define um só alvo de aplicação, o identificador `com.luismartins.pugplanner.b7d839ce` e a versão mínima iOS 16.0. A configuração usa o Info.plist incluído. O identificador tem um sufixo específico desta entrega. A disponibilidade para registo é verificada pela Apple durante a assinatura. A extensão de partilha externa e o App Group da versão anterior foram retirados. Para criar uma tarefa a partir de uma fotografia, escolhe **Criar a partir de imagem** no Pug Planner.

No iOS 26 e posterior, a app pede autorização para usar AlarmKit. Em versões anteriores usa notificações locais normais com som, sujeitas ao modo silencioso, à Concentração e às preferências de notificações. Nestas versões, a app programa até 64 ocorrências futuras, contando com os temporizadores, e repõe a fila ao abrires a app ou alterares o plano. Estas notificações terminam após a reprodução do som. O ditado usa o teclado do iPhone. O projeto não declara entitlements nem solicita Push Notifications, alertas críticos, iCloud, App Groups ou Sign in with Apple.

O workflow em `.github/workflows/build-ipa.yml` escolhe o Xcode estável mais recente que encontrar no runner, mostra as versões de Xcode e do SDK e exige SDK iOS 26 ou posterior para compilar o ramo AlarmKit. Gera o projeto Xcode temporariamente. Depois compila para iPhone físico em Release, verifica o pacote, cria `Payload/PugPlanner.app` e publica `PugPlanner.ipa` como artefacto. A assinatura ocorre depois no Windows. O projeto e o IPA gerados não precisam de entrar no repositório.

## D. Do ZIP ao iPhone, sem instalar Git

1. **Extrai o ZIP de código-fonte no Windows.** Na pasta extraída, confirma que vês `App`, `project.yml` e `README.md`. No Explorador, podes ativar **Ver → Mostrar → Itens ocultos** para localizar também `.github`.
2. **Cria um repositório público** na tua conta GitHub. Escolhe um nome como `pug-planner-iphone`, seleciona **Public** e cria-o vazio. Os runners standard alojados pelo GitHub, incluindo o macOS standard usado aqui, têm execução gratuita nos repositórios públicos. [Novo repositório](https://github.com/new) · [Faturação oficial do GitHub Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
3. **Carrega o código.** Na página inicial do repositório vazio, escolhe **uploading an existing file**. Arrasta a pasta `App` e os ficheiros `project.yml` e `README.md` para a página. Confirma com **Commit changes** na branch principal. Na raiz deve aparecer `App/Info.plist` dentro de `App` e `project.yml` ao lado dessa pasta. Carrega só o conteúdo deste pacote. As cópias de segurança pessoais ficam no teu dispositivo.
4. **Adiciona o workflow.** Em **Code → Add file → Create new file**, escreve o nome completo `.github/workflows/build-ipa.yml`. No Windows, abre o ficheiro homónimo do ZIP no Bloco de Notas, copia todo o conteúdo e cola-o no editor do GitHub. Escolhe **Commit changes** na branch principal. Este método funciona mesmo que o browser ignore a pasta iniciada por ponto durante o arrasto.
5. **Acompanha a compilação.** Abre **Actions → Build unsigned IPA** e seleciona a execução iniciada pelo commit. Se o GitHub pedir, ativa Actions no repositório. Para iniciar outra compilação, usa **Run workflow**, escolhe a branch principal e confirma. Um visto verde no trabalho `build` confirma que essa revisão compilou e produziu o IPA. No log de **Selecionar Xcode** encontras as versões exatas. A compilação no runner ainda tem de ser executada para validar esta entrega.
6. **Descarrega o IPA.** Na página de resumo da execução bem-sucedida, vai a **Artifacts → PugPlanner-IPA**. Extrai o ZIP descarregado. O ficheiro a arrastar para o Sideloadly chama-se `PugPlanner.ipa`. Mantém-no guardado no PC para as renovações.
7. **Prepara o Windows.** Na página oficial do Sideloadly, seleciona **Windows**. A caixa **Before you install** contém os links **Web iTunes 64-bit**, **Web iTunes 32-bit** e **Web iCloud** que apontam para os servidores da Apple. Escolhe o iTunes adequado ao teu Windows, normalmente 64 bits, e o iCloud para desktop. Se tiveres as edições da Microsoft Store, segue a indicação do Sideloadly para as desinstalar antes de instalar as versões web. Instala ambos, reinicia se solicitado e instala o Sideloadly a partir da mesma página. [Downloads oficiais e ligações Apple](https://sideloadly.io/)
8. **Liga o iPhone.** Usa um cabo USB que transfira dados, desbloqueia o telemóvel e toca em **Confiar** quando te perguntar se confias no computador. Introduz o código do iPhone. Abre o iTunes e verifica que o dispositivo aparece.
9. **Assina e instala.** Abre o Sideloadly, seleciona o iPhone em **iDevice**, arrasta `PugPlanner.ipa` para a janela, introduz o email da tua conta Apple gratuita e usa o modo **Apple ID Sideload**. Clica em **Start** e completa a autenticação, incluindo o código de dois fatores se for pedido. Espera por **Done**. O Apple ID é usado no Sideloadly no PC. O repositório e o workflow não precisam da tua palavra-passe, de certificados nem de secrets.
10. **Ativa o Modo de programador.** No iPhone, abre **Definições → Privacidade e segurança → Modo de programador**, ativa, aceita reiniciar e confirma a ativação após o reinício. Se a opção estiver ausente, faz primeiro o emparelhamento USB e a tentativa de instalação do passo anterior. [Ajuda do Sideloadly](https://sideloadly.io/faq)
11. **Autoriza a app.** Abre **Definições → Geral → VPN e gestão de dispositivos**. Em **Aplicação de programador**, seleciona a tua conta Apple e toca em **Confiar** ou na opção de autorização equivalente. Segue qualquer pedido de reinício e mantém ligação à Internet durante a verificação. Abre o Pug Planner e experimenta um lembrete a dois minutos com o ecrã bloqueado.
12. **Renova em cada período de sete dias.** Liga o mesmo iPhone e volta a instalar o mesmo IPA por cima da instalação existente, com o mesmo Apple ID e o mesmo identificador efetivo no Sideloadly. Podes renovar antes de expirar. Não precisas de repetir o GitHub Actions se o código não mudou. Também podes ativar a renovação automática do Sideloadly se o PC e o iPhone estiverem acessíveis ao serviço. Exporta os dados em **Pug → Cópia de segurança** antes de desinstalar ou mudar de identificador. [Validade e renovação](https://sideloadly.io/faq)

## E. Se o build falhar

Abre a execução vermelha em Actions, entra no trabalho **build**, expande o primeiro passo vermelho e procura a primeira linha com `error:`. O código 65 no final, por si só, não identifica a causa.

| Mensagem ou sintoma | Correção |
| --- | --- |
| O workflow não aparece em Actions | Confirma o caminho exato `.github/workflows/build-ipa.yml` na branch principal. Verifica em Settings → Actions → General se os workflows estão permitidos. |
| Invalid workflow file | Cola novamente o YAML integral com espaços e conserva a indentação. Confirma que o Bloco de Notas não acrescentou `.txt` ao nome. |
| XcodeGen não encontra o ficheiro de especificação ou uma pasta de origem | Coloca `project.yml` na raiz e confere a capitalização de `App/Interface` e dos restantes nomes. Se carregaste o ZIP inteiro ou uma pasta exterior, extrai e carrega o conteúdo. |
| Falha em brew install ou no download do checkout | Verifica o primeiro erro de rede ou de serviço. Em caso de falha temporária, seleciona **Re-run failed jobs**. |
| No such module 'AlarmKit' ou falha na verificação do SDK | Confere o SDK selecionado no log. É necessário um Xcode instalado com SDK iOS 26 ou mais recente, mesmo que o iPhone corra iOS 16. O workflow procura essa versão entre as instalações estáveis. Se a imagem mudar, consulta o inventário do runner e ajusta a seleção de Xcode. [Imagens do GitHub](https://github.com/actions/runner-images) |
| Scheme PugPlanner not found | Confirma que o ficheiro carregado contém a secção `schemes` e que o passo `xcodegen generate` terminou com sucesso. |
| Signing requires a development team ou No profiles found | Confere no log se o comando contém `CODE_SIGNING_ALLOWED=NO`, `CODE_SIGNING_REQUIRED=NO` e `CODE_SIGN_IDENTITY=""`. Usa o workflow entregue para `build`; a assinatura é feita pelo Sideloadly. |
| Multiple commands produce Info.plist ou erro de AppIcon | Confirma a exclusão de `Info.plist` nas fontes, o valor de `INFOPLIST_FILE` e o carregamento da árvore inteira de `Assets.xcassets`, incluindo os dois `Contents.json` e `icon.png`. |
| O passo de empacotamento falha | Inspeciona qual dos testes falhou. O produto deve estar em `build/Build/Products/Release-iphoneos/PugPlanner.app`. Se faltar `Interface/index.html`, repõe a referência `type: folder` e a pasta completa. Um produto de simulador não serve para instalar no iPhone. |
| Erro de compilação Swift com ficheiro e linha | Guarda a primeira mensagem completa, o nome do ficheiro, a linha e as versões de Xcode/SDK do log. Este é um erro de código ou de SDK e precisa de ser corrigido antes da instalação. |

Se o build ficou verde e **o Sideloadly** falhou, o problema já é de emparelhamento ou assinatura. Para um iPhone ausente, verifica primeiro o cabo, o pedido de confiança e a deteção no iTunes. Para identificador indisponível, define um identificador pessoal único no Sideloadly e conserva-o nas renovações. Se atingiste o limite da conta gratuita, segue a mensagem de limite ou expiração do Sideloadly. Se a app aparecer mas não abrir, confirma Modo de programador, confiança no perfil e validade da assinatura. [FAQ oficial](https://sideloadly.io/faq)



## Atualização 1.11.1

Em **Pug → Personalização → Alterar imagem do Pug**, escolhe uma fotografia da Fototeca ou tira uma com a Câmara. A fotografia aparece no início e nas páginas que usam a imagem do Pug. Podes escolher **Repor ilustração original** em qualquer altura. A imagem fica guardada com os dados da app e entra na cópia de segurança JSON.

Os clips de exercício incluídos abrem na ficha e funcionam sem Internet. O [inventário de demonstrações](DEMONSTRACOES.md) indica a duração, a fonte e o nome dos exercícios que conservam apenas instruções escritas. As práticas de meditação e os exercícios de comportamento do pet estão em texto nesta edição.

Para atualizar pelo GitHub, carrega a pasta **App** do ZIP no repositório existente, incluindo **App/Interface/demos**. Instala o novo IPA por cima da edição anterior com o mesmo Apple ID e o mesmo identificador efetivo no Sideloadly. Podes exportar primeiro uma cópia JSON em **Pug**.
