"use strict";(self.webpackChunkdsanchezcr=self.webpackChunkdsanchezcr||[]).push([[5282],{1752:(e,i,r)=>{r.r(i),r.d(i,{assets:()=>t,contentTitle:()=>a,default:()=>d,frontMatter:()=>o,metadata:()=>s,toc:()=>l});var n=r(5893),c=r(1151);const o={title:"Creaci\xf3n de un formulario de contacto sencillo",description:"En esta publicaci\xf3n, crearemos un formulario de contacto con Azure Functions y Azure Communication Services",slug:"building-a-contact-form-with-azure",authors:["dsanchezcr"],tags:["Azure Functions","GitHub Actions","Azure Communication Services","Azure Static Web Apps"],enableComments:!0,hide_table_of_contents:!0,image:"https://raw.githubusercontent.com/dsanchezcr/website/main/static/img/BuiltContactForm/ContactForm.jpg",date:"2023-04-23T18:00"},a="Creaci\xf3n de un formulario de contacto sencillo con Azure",s={permalink:"/es/blog/building-a-contact-form-with-azure",source:"@site/i18n/es/docusaurus-plugin-content-blog/2023-04-23-BuildContactForm.mdx",title:"Creaci\xf3n de un formulario de contacto sencillo",description:"En esta publicaci\xf3n, crearemos un formulario de contacto con Azure Functions y Azure Communication Services",date:"2023-04-23T18:00:00.000Z",formattedDate:"23 de abril de 2023",tags:[{label:"Azure Functions",permalink:"/es/blog/tags/azure-functions"},{label:"GitHub Actions",permalink:"/es/blog/tags/git-hub-actions"},{label:"Azure Communication Services",permalink:"/es/blog/tags/azure-communication-services"},{label:"Azure Static Web Apps",permalink:"/es/blog/tags/azure-static-web-apps"}],readingTime:4.475,hasTruncateMarker:!0,authors:[{name:"David Sanchez",url:"https://github.com/dsanchezcr",imageURL:"https://github.com/dsanchezcr.png",key:"dsanchezcr"}],frontMatter:{title:"Creaci\xf3n de un formulario de contacto sencillo",description:"En esta publicaci\xf3n, crearemos un formulario de contacto con Azure Functions y Azure Communication Services",slug:"building-a-contact-form-with-azure",authors:["dsanchezcr"],tags:["Azure Functions","GitHub Actions","Azure Communication Services","Azure Static Web Apps"],enableComments:!0,hide_table_of_contents:!0,image:"https://raw.githubusercontent.com/dsanchezcr/website/main/static/img/BuiltContactForm/ContactForm.jpg",date:"2023-04-23T18:00"},unlisted:!1,prevItem:{title:"Commits verificados en GitHub",permalink:"/es/blog/verified-commits-in-github"},nextItem:{title:"Migraci\xf3n de repositorios de Azure DevOps a GitHub",permalink:"/es/blog/azure-devops-to-github-repo-migration"}},t={authorsImageUrls:[void 0]},l=[{value:"Introducci\xf3n",id:"introducci\xf3n",level:2},{value:"\xbfPor qu\xe9 Azure Functions?",id:"por-qu\xe9-azure-functions",level:2},{value:"\xbfQu\xe9 es Azure Communication Service?",id:"qu\xe9-es-azure-communication-service",level:2},{value:"Creaci\xf3n del formulario de contacto con Azure Functions y Azure Communication Service",id:"creaci\xf3n-del-formulario-de-contacto-con-azure-functions-y-azure-communication-service",level:2},{value:"1. Creaci\xf3n de los recursos de Azure",id:"1-creaci\xf3n-de-los-recursos-de-azure",level:4},{value:"2. Configuraci\xf3n de Azure Communication Services - Servicio de correo electr\xf3nico",id:"2-configuraci\xf3n-de-azure-communication-services---servicio-de-correo-electr\xf3nico",level:4},{value:"3. Desarrollo de la funci\xf3n Azure",id:"3-desarrollo-de-la-funci\xf3n-azure",level:4},{value:"4. Desarrolla el front-end",id:"4-desarrolla-el-front-end",level:4},{value:"5. Acciones de GitHub para compilar e implementar la soluci\xf3n",id:"5-acciones-de-github-para-compilar-e-implementar-la-soluci\xf3n",level:4},{value:"Prueba de la soluci\xf3n",id:"prueba-de-la-soluci\xf3n",level:2}];function u(e){const i={a:"a",blockquote:"blockquote",code:"code",h2:"h2",h4:"h4",img:"img",li:"li",p:"p",pre:"pre",ul:"ul",...(0,c.a)(),...e.components};return(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(i.p,{children:"En esta publicaci\xf3n, crearemos un formulario de contacto con Azure Functions y Azure Communication Services."}),"\n",(0,n.jsx)(i.h2,{id:"introducci\xf3n",children:"Introducci\xf3n"}),"\n",(0,n.jsx)(i.p,{children:"Tener un formulario de contacto funcional en su sitio web es esencial. Un formulario de contacto es una forma simple pero efectiva de recibir consultas y comentarios de sus visitantes, clientes o clientes. En esta entrada de blog, compartir\xe9 mi experiencia en la creaci\xf3n de un formulario de contacto con Azure Functions y el servicio de correo electr\xf3nico de Azure Communication Service."}),"\n",(0,n.jsx)(i.h2,{id:"por-qu\xe9-azure-functions",children:"\xbfPor qu\xe9 Azure Functions?"}),"\n",(0,n.jsxs)(i.p,{children:[(0,n.jsx)(i.a,{href:"https://learn.microsoft.com/azure/azure-functions/functions-overview?WT.mc_id=DT-MVP-5005361",children:"Azure Functions"})," es un servicio inform\xe1tico sin servidor ofrecido por Microsoft Azure. Permite a los desarrolladores crear, ejecutar y escalar aplicaciones sin tener que administrar la infraestructura. Azure Functions admite varios lenguajes de programaci\xf3n, incluidos C#, Java, JavaScript, Python y PowerShell."]}),"\n",(0,n.jsx)(i.p,{children:"En este caso, mi sitio web se ejecuta en una aplicaci\xf3n web est\xe1tica, por lo que necesito usar una soluci\xf3n sin servidor para crear el formulario de contacto. Azure Functions es una excelente opci\xf3n porque me permite crear un formulario de contacto sin tener que administrar la infraestructura o preocuparme por las complejidades de los protocolos de comunicaci\xf3n."}),"\n",(0,n.jsx)(i.h2,{id:"qu\xe9-es-azure-communication-service",children:"\xbfQu\xe9 es Azure Communication Service?"}),"\n",(0,n.jsxs)(i.p,{children:[(0,n.jsx)(i.a,{href:"https://learn.microsoft.com/azure/communication-services/overview?WT.mc_id=DT-MVP-5005361",children:"Servicio de comunicaci\xf3n de Azure"})," es una plataforma de comunicaci\xf3n ofrecida por Microsoft Azure. Proporciona a los desarrolladores las herramientas y servicios para integrar funciones de comunicaci\xf3n en tiempo real, como voz, video, chat y mensajer\xeda SMS en sus aplicaciones. Azure Communication Service tambi\xe9n ofrece un ",(0,n.jsx)(i.a,{href:"https://learn.microsoft.com/azure/communication-services/concepts/email/email-overview?WT.mc_id=DT-MVP-5005361",children:"Servicio de correo electr\xf3nico"})," Eso permite a los desarrolladores enviar y recibir correos electr\xf3nicos mediante programaci\xf3n."]}),"\n",(0,n.jsx)(i.h2,{id:"creaci\xf3n-del-formulario-de-contacto-con-azure-functions-y-azure-communication-service",children:"Creaci\xf3n del formulario de contacto con Azure Functions y Azure Communication Service"}),"\n",(0,n.jsx)(i.p,{children:"Para crear un formulario de contacto con Azure Functions y el servicio de correo electr\xf3nico del Servicio de comunicaci\xf3n de Azure, segu\xed estos pasos:"}),"\n",(0,n.jsx)(i.h4,{id:"1-creaci\xf3n-de-los-recursos-de-azure",children:"1. Creaci\xf3n de los recursos de Azure"}),"\n",(0,n.jsx)(i.p,{children:"El primer paso fue crear los recursos de Azure. Estos son los recursos que utilic\xe9 en esta aplicaci\xf3n de ejemplo:"}),"\n",(0,n.jsxs)(i.ul,{children:["\n",(0,n.jsxs)(i.li,{children:[(0,n.jsx)(i.a,{href:"https://learn.microsoft.com/azure/communication-services/quickstarts/create-communication-resource?WT.mc_id=DT-MVP-5005361",children:"Servicio de comunicaci\xf3n de Azure"})," - para gestionar el servicio de correo electr\xf3nico."]}),"\n",(0,n.jsxs)(i.li,{children:[(0,n.jsx)(i.a,{href:"https://learn.microsoft.com/azure/communication-services/quickstarts/email/create-email-communication-resource?WT.mc_id=DT-MVP-5005361",children:"Azure Email Service (parte de Azure Communication Service)"})," - para enviar los correos electr\xf3nicos."]}),"\n",(0,n.jsxs)(i.li,{children:[(0,n.jsx)(i.a,{href:"https://learn.microsoft.com/azure/azure-functions/functions-create-first-function-vs-code?WT.mc_id=DT-MVP-5005361&pivots=programming-language-csharp",children:"Azure Function"})," - para procesar el desencadenador HTTP enviado por el HTML y enviar los correos electr\xf3nicos mediante Azure Communication Service."]}),"\n",(0,n.jsxs)(i.li,{children:[(0,n.jsx)(i.a,{href:"https://learn.microsoft.com/azure/static-web-apps/getting-started?WT.mc_id=DT-MVP-5005361",children:"Aplicaci\xf3n web est\xe1tica de Azure"})," - para alojar el sitio web (\xcdndice.html en este caso)."]}),"\n"]}),"\n",(0,n.jsx)(i.p,{children:(0,n.jsx)(i.img,{src:"/img/BuiltContactForm/AzureResourceVisualizer.jpg",alt:""})}),"\n",(0,n.jsx)(i.h4,{id:"2-configuraci\xf3n-de-azure-communication-services---servicio-de-correo-electr\xf3nico",children:"2. Configuraci\xf3n de Azure Communication Services - Servicio de correo electr\xf3nico"}),"\n",(0,n.jsx)(i.p,{children:"El siguiente paso fue configurar Azure Communication Services - Email Service. Esto incluye configurar una direcci\xf3n de correo electr\xf3nico para enviar correos electr\xf3nicos. Al crear este servicio, puede elegir si desea usar un subdominio de Azure o si desea configurar su propio dominio."}),"\n",(0,n.jsx)(i.p,{children:(0,n.jsx)(i.img,{src:"/img/BuiltContactForm/AzureEmailCommunicationService.jpg",alt:""})}),"\n",(0,n.jsx)(i.p,{children:"En este caso, us\xe9 la direcci\xf3n de correo electr\xf3nico aprovisionada por un subdominio de Azure."}),"\n",(0,n.jsx)(i.p,{children:(0,n.jsx)(i.img,{src:"/img/BuiltContactForm/DomainProvision.jpg",alt:""})}),"\n",(0,n.jsx)(i.p,{children:"La direcci\xf3n de correo electr\xf3nico se cre\xf3 y configur\xf3 autom\xe1ticamente:"}),"\n",(0,n.jsx)(i.p,{children:(0,n.jsx)(i.img,{src:"/img/BuiltContactForm/EmailCommunicationService.jpg",alt:""})}),"\n",(0,n.jsx)(i.h4,{id:"3-desarrollo-de-la-funci\xf3n-azure",children:"3. Desarrollo de la funci\xf3n Azure"}),"\n",(0,n.jsx)(i.p,{children:"El primer paso fue crear una funci\xf3n de Azure. Puede elegir entre varias plantillas basadas en el lenguaje de programaci\xf3n de su elecci\xf3n. En este caso, us\xe9 VS Code para crear la funci\xf3n de Azure de C# con un desencadenador HTTP. La funci\xf3n env\xeda dos correos electr\xf3nicos, uno para notificar al propietario del sitio web y otro para notificar al usuario que env\xeda el mensaje a trav\xe9s del sitio web para informarme que su mensaje fue enviado."}),"\n",(0,n.jsxs)(i.blockquote,{children:["\n",(0,n.jsxs)(i.p,{children:["Para llamar a Azure Function, es necesario enviar tres par\xe1metros: ",(0,n.jsx)(i.code,{children:"name"}),", ",(0,n.jsx)(i.code,{children:"email"}),"y ",(0,n.jsx)(i.code,{children:"message"}),".\r\nAdem\xe1s, la funci\xf3n usa tres variables de entorno que debe crear en la configuraci\xf3n de Azure Function:"]}),"\n"]}),"\n",(0,n.jsxs)(i.ul,{children:["\n",(0,n.jsxs)(i.li,{children:[(0,n.jsx)(i.code,{children:"myEmailAddress"}),": para notificar al propietario del sitio web que se ha recibido un nuevo mensaje."]}),"\n",(0,n.jsxs)(i.li,{children:[(0,n.jsx)(i.code,{children:"senderEmailAddress"}),": la direcci\xf3n de correo electr\xf3nico que se aprovision\xf3 en la configuraci\xf3n del Servicio de comunicaci\xf3n de Azure."]}),"\n",(0,n.jsxs)(i.li,{children:[(0,n.jsx)(i.code,{children:"AzureCommunicationServicesConnectionString"}),": la cadena de conexi\xf3n que se aprovision\xf3 en la configuraci\xf3n del Servicio de comunicaci\xf3n de Azure."]}),"\n"]}),"\n",(0,n.jsxs)(i.p,{children:["El ",(0,n.jsx)(i.a,{href:"https://learn.microsoft.com/dotnet/api/azure.communication.email.emailclient?view=azure-dotnet?WT.mc_id=DT-MVP-5005361",children:"Cliente de correo electr\xf3nico"})," class se usa para enviar correos electr\xf3nicos mediante el servicio de correo electr\xf3nico del servicio de comunicaci\xf3n de Azure y se inicializa con la cadena de conexi\xf3n."]}),"\n",(0,n.jsx)(i.p,{children:"El siguiente fragmento de c\xf3digo muestra la funci\xf3n desencadenadora HTTP:"}),"\n",(0,n.jsx)(i.pre,{children:(0,n.jsx)(i.code,{className:"language-c",metastring:'reference title="Azure Function HTTP Trigger - SendEmails.cs"',children:"https://github.com/dsanchezcr/ContactFormWithAzure/blob/9f619eb2c8d41e45574557dbf3c2f95486391d30/api/SendEmails.cs#L17-L57\n"})}),"\n",(0,n.jsx)(i.h4,{id:"4-desarrolla-el-front-end",children:"4. Desarrolla el front-end"}),"\n",(0,n.jsx)(i.p,{children:"En mi caso, cre\xe9 un archivo HTML simple y agregu\xe9 los campos de formulario necesarios para el formulario de contacto, nombre, correo electr\xf3nico y mensaje."}),"\n",(0,n.jsx)(i.pre,{children:(0,n.jsx)(i.code,{className:"language-html",metastring:'reference title="Form to to send the email"',children:"https://github.com/dsanchezcr/ContactFormWithAzure/blob/9f619eb2c8d41e45574557dbf3c2f95486391d30/Index.html#L123-L137\n"})}),"\n",(0,n.jsx)(i.p,{children:"Este es el c\xf3digo JavaScript que us\xe9 para procesar la llamada a Azure Function:"}),"\n",(0,n.jsx)(i.pre,{children:(0,n.jsx)(i.code,{className:"language-javascript",metastring:'reference title="JavaScript code to call the Azure Function"',children:"https://github.com/dsanchezcr/ContactFormWithAzure/blob/9f619eb2c8d41e45574557dbf3c2f95486391d30/Index.html#L8-L32\n"})}),"\n",(0,n.jsx)(i.h4,{id:"5-acciones-de-github-para-compilar-e-implementar-la-soluci\xf3n",children:"5. Acciones de GitHub para compilar e implementar la soluci\xf3n"}),"\n",(0,n.jsx)(i.p,{children:"Cre\xe9 una acci\xf3n de GitHub para compilar e implementar Azure Function y el sitio web. El siguiente fragmento de c\xf3digo muestra la acci\xf3n de GitHub:"}),"\n",(0,n.jsx)(i.pre,{children:(0,n.jsx)(i.code,{className:"language-yaml",metastring:'reference title="GitHub Action to build and deploy the solution"',children:"https://github.com/dsanchezcr/ContactFormWithAzure/blob/9f619eb2c8d41e45574557dbf3c2f95486391d30/.github/workflows/main_contactformwithazure.yml#L1-L45\n"})}),"\n",(0,n.jsxs)(i.blockquote,{children:["\n",(0,n.jsx)(i.p,{children:"La acci\xf3n de GitHub usa dos secretos que debes configurar:"}),"\n"]}),"\n",(0,n.jsxs)(i.ul,{children:["\n",(0,n.jsxs)(i.li,{children:[(0,n.jsx)(i.code,{children:"AZUREAPPSERVICE_PUBLISHPROFILE"}),": el perfil de publicaci\xf3n de Azure Function."]}),"\n",(0,n.jsxs)(i.li,{children:[(0,n.jsx)(i.code,{children:"AZURE_STATIC_WEB_APPS_API_TOKEN"}),": el token de API de Azure Static Web App."]}),"\n"]}),"\n",(0,n.jsx)(i.h2,{id:"prueba-de-la-soluci\xf3n",children:"Prueba de la soluci\xf3n"}),"\n",(0,n.jsx)(i.p,{children:"Prob\xe9 la soluci\xf3n enviando un mensaje desde el formulario de contacto. La siguiente imagen muestra el correo electr\xf3nico que se envi\xf3 al propietario del sitio web y el correo electr\xf3nico que se envi\xf3 al usuario que public\xf3 el mensaje."}),"\n",(0,n.jsx)(i.p,{children:(0,n.jsx)(i.img,{src:"/img/BuiltContactForm/ContactFormResult.jpg",alt:""})}),"\n",(0,n.jsxs)(i.p,{children:["Puedes probar la soluci\xf3n ",(0,n.jsx)(i.a,{href:"https://purple-sky-05cd51e0f.3.azurestaticapps.net/Index.html",children:"aqu\xed"}),"."]}),"\n",(0,n.jsxs)(i.p,{children:["Y echa un vistazo a mi formulario de contacto de producci\xf3n ",(0,n.jsx)(i.a,{href:"https://dsanchezcr.com/contact",children:"aqu\xed"}),"."]})]})}function d(e={}){const{wrapper:i}={...(0,c.a)(),...e.components};return i?(0,n.jsx)(i,{...e,children:(0,n.jsx)(u,{...e})}):u(e)}},1151:(e,i,r)=>{r.d(i,{Z:()=>s,a:()=>a});var n=r(7294);const c={},o=n.createContext(c);function a(e){const i=n.useContext(o);return n.useMemo((function(){return"function"==typeof e?e(i):{...i,...e}}),[i,e])}function s(e){let i;return i=e.disableParentContext?"function"==typeof e.components?e.components(c):e.components||c:a(e.components),n.createElement(o.Provider,{value:i},e.children)}}}]);