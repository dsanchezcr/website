"use strict";(self.webpackChunkdsanchezcr=self.webpackChunkdsanchezcr||[]).push([[3344],{5652:(e,s,a)=>{a.r(s),a.d(s,{assets:()=>c,contentTitle:()=>o,default:()=>u,frontMatter:()=>r,metadata:()=>t,toc:()=>d});var n=a(5893),i=a(1151);const r={title:"Agregar pruebas de carga a los flujos de trabajo de CI/CD",description:"Obtenga informaci\xf3n sobre Azure Load Testing y c\xf3mo incluirlo en sus acciones de GitHub",slug:"adding-load-testing-to-your-workflows",authors:["dsanchezcr"],tags:["Azure","Load Testing","GitHub Actions"],enableComments:!0,hide_table_of_contents:!0,image:"https://raw.githubusercontent.com/dsanchezcr/website/main/static/img/LoadTesting/LoadTestingWebApp.jpg",date:"2022-12-21T18:00"},o="Agregar pruebas de carga a los flujos de trabajo de CI/CD",t={permalink:"/es/blog/adding-load-testing-to-your-workflows",source:"@site/i18n/es/docusaurus-plugin-content-blog/2022-12-21-LoadTesting.mdx",title:"Agregar pruebas de carga a los flujos de trabajo de CI/CD",description:"Obtenga informaci\xf3n sobre Azure Load Testing y c\xf3mo incluirlo en sus acciones de GitHub",date:"2022-12-21T18:00:00.000Z",formattedDate:"21 de diciembre de 2022",tags:[{label:"Azure",permalink:"/es/blog/tags/azure"},{label:"Load Testing",permalink:"/es/blog/tags/load-testing"},{label:"GitHub Actions",permalink:"/es/blog/tags/git-hub-actions"}],readingTime:4.845,hasTruncateMarker:!0,authors:[{name:"David Sanchez",url:"https://github.com/dsanchezcr",imageURL:"https://github.com/dsanchezcr.png",key:"dsanchezcr"}],frontMatter:{title:"Agregar pruebas de carga a los flujos de trabajo de CI/CD",description:"Obtenga informaci\xf3n sobre Azure Load Testing y c\xf3mo incluirlo en sus acciones de GitHub",slug:"adding-load-testing-to-your-workflows",authors:["dsanchezcr"],tags:["Azure","Load Testing","GitHub Actions"],enableComments:!0,hide_table_of_contents:!0,image:"https://raw.githubusercontent.com/dsanchezcr/website/main/static/img/LoadTesting/LoadTestingWebApp.jpg",date:"2022-12-21T18:00"},unlisted:!1,prevItem:{title:"Ahorro de costos con Azure para sus aplicaciones web",permalink:"/es/blog/cost-savings-with-azure"},nextItem:{title:"Webinar - Del c\xf3digo a la nube de forma segura con GitHub Advanced Security",permalink:"/es/blog/Webinar-GHAS"}},c={authorsImageUrls:[void 0]},d=[{value:"Introducci\xf3n",id:"introducci\xf3n",level:2},{value:"\xbfQu\xe9 necesitamos?",id:"qu\xe9-necesitamos",level:2},{value:"Empezando",id:"empezando",level:2},{value:"El escenario",id:"el-escenario",level:3},{value:"El entorno",id:"el-entorno",level:3},{value:"El repositorio",id:"el-repositorio",level:3},{value:"La acci\xf3n de GitHub",id:"la-acci\xf3n-de-github",level:3},{value:"Los resultados",id:"los-resultados",level:3},{value:"Conclusiones",id:"conclusiones",level:2}];function l(e){const s={a:"a",blockquote:"blockquote",h2:"h2",h3:"h3",img:"img",li:"li",p:"p",strong:"strong",ul:"ul",...(0,i.a)(),...e.components};return(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(s.h2,{id:"introducci\xf3n",children:"Introducci\xf3n"}),"\n",(0,n.jsx)(s.p,{children:"Las pruebas de carga son una t\xe9cnica que se centra en evaluar el rendimiento de una aplicaci\xf3n en condiciones de carga normales o esperadas. El objetivo es determinar c\xf3mo se comporta la aplicaci\xf3n cuando est\xe1 sujeta a los niveles esperados de uso y tr\xe1fico. Las pruebas de carga se utilizan a menudo para comprobar que un sistema puede controlar el n\xfamero esperado de usuarios y transacciones, y para identificar cualquier cuello de botella o problema de rendimiento que pueda afectar a la experiencia del usuario."}),"\n",(0,n.jsxs)(s.p,{children:["Microsoft Azure ofrece un nuevo servicio (en versi\xf3n preliminar), llamado ",(0,n.jsx)(s.a,{href:"https://azure.microsoft.com/products/load-testing",children:"Pruebas de carga de Azure"}),". Uno de los beneficios clave de usar este servicio es que le permite probar el rendimiento de su aplicaci\xf3n a una escala sin tener que invertir en hardware e infraestructura costosos. Adem\xe1s, es altamente configurable y se puede usar para probar aplicaciones hospedadas en una variedad de plataformas, como Azure, servidores locales y proveedores de nube de terceros."]}),"\n",(0,n.jsx)(s.h2,{id:"qu\xe9-necesitamos",children:"\xbfQu\xe9 necesitamos?"}),"\n",(0,n.jsxs)(s.p,{children:["Adem\xe1s de una suscripci\xf3n de Azure y una cuenta de GitHub, necesitaremos un ",(0,n.jsx)(s.a,{href:"https://jmeter.apache.org",children:"Apache JMeter"})," script, que normalmente consta de una serie de elementos de prueba, incluidos grupos de subprocesos, samplers, oyentes y aserciones. Los grupos de subprocesos definen el n\xfamero y el tipo de usuarios virtuales que se simular\xe1n, mientras que los muestreadores definen las acciones o solicitudes espec\xedficas que realizar\xe1n los usuarios virtuales. Los oyentes capturan los datos de rendimiento generados por la prueba, y las aserciones definen los resultados esperados de la prueba y verifican que los resultados reales coincidan con las expectativas."]}),"\n",(0,n.jsx)(s.p,{children:(0,n.jsx)(s.a,{href:"https://raw.githubusercontent.com/dsanchezcr/LoadTestingDemo/main/LoadTestingScript.jmx",children:"Aqu\xed puedes encontrar el script que cre\xe9 como parte de esta demo"})}),"\n",(0,n.jsx)(s.p,{children:(0,n.jsx)(s.a,{href:"https://raw.githubusercontent.com/dsanchezcr/LoadTestingDemo/main/LoadTestingScript.jmx",children:(0,n.jsx)(s.img,{src:"/img/LoadTesting/JMeterScript.jpg",alt:"Here you can find the script I created as part of this demo"})})}),"\n",(0,n.jsx)(s.h2,{id:"empezando",children:"Empezando"}),"\n",(0,n.jsx)(s.p,{children:"En el siguiente ejemplo, vamos a usar Azure Load Testing en nuestro flujo de trabajo desde GitHub Actions para detectar cu\xe1ndo nuestra aplicaci\xf3n web ha alcanzado un problema de rendimiento. Vamos a definir un escenario de prueba de carga con un n\xfamero y tipo espec\xedfico de usuarios virtuales que se simular\xe1n, as\xed como la duraci\xf3n de la prueba y el tipo de carga de trabajo a simular, que en este caso es solo una solicitud HTTP. Adem\xe1s, tambi\xe9n puede usar Visual Studio o el Portal de Azure para crear y configurar el escenario de prueba de carga."}),"\n",(0,n.jsx)(s.p,{children:"Una vez definido el escenario de prueba de carga, podemos revisar los resultados y los datos de supervisi\xf3n, que incluyen m\xe9tricas como el tiempo de respuesta, el uso de CPU y el tr\xe1fico de red, as\xed como contadores de rendimiento personalizados que podemos definir. Con estos datos identificamos cuellos de botella y optimizamos el rendimiento de la aplicaci\xf3n."}),"\n",(0,n.jsx)(s.h3,{id:"el-escenario",children:"El escenario"}),"\n",(0,n.jsxs)(s.p,{children:["Desarroll\xe9 un simple ",(0,n.jsx)(s.a,{href:"https://loadtestingweb.azurewebsites.net",children:"Aplicaci\xf3n Web"})," compilado con ASP.NET Core con .NET 7 que se conecta a Azure Cosmos DB y agrega un registro de cada visita a la p\xe1gina y recupera los datos de todas las visitas."]}),"\n",(0,n.jsx)(s.p,{children:(0,n.jsx)(s.a,{href:"https://loadtestingweb.azurewebsites.net",children:(0,n.jsx)(s.img,{src:"/img/LoadTesting/LoadTestingWebApp.jpg",alt:"Load Testing Sample Web App"})})}),"\n",(0,n.jsx)(s.h3,{id:"el-entorno",children:"El entorno"}),"\n",(0,n.jsxs)(s.p,{children:["Esta aplicaci\xf3n web se ejecuta en un Servicio de aplicaciones ",(0,n.jsx)("strong",{children:"B\xe1sico"})," y tiene Applications Insights para supervisar el rendimiento de la aplicaci\xf3n. Cosmos DB se establece con el comando ",(0,n.jsx)("strong",{children:"Nivel gratuito "}),"(1000 RU/s y 25 GB). Quiero averiguar si la aplicaci\xf3n que se ejecuta en este entorno puede admitir hasta 100 usuarios simult\xe1neos.\r\n(",(0,n.jsx)(s.a,{href:"https://loadtestingweb.azurewebsites.net",children:"https://loadtestingweb.azurewebsites.net"}),")\r\n",(0,n.jsx)(s.img,{src:"/img/LoadTesting/AzurePortal.jpg",alt:"Azure Portal for Load Testing"})]}),"\n",(0,n.jsx)(s.h3,{id:"el-repositorio",children:"El repositorio"}),"\n",(0,n.jsxs)(s.p,{children:["Puedes consultar el ",(0,n.jsx)(s.strong,{children:"Repositorio de GitHub"})," ",(0,n.jsx)(s.a,{href:"https://github.com/dsanchezcr/LoadTestingDemo",children:"aqu\xed"}),". All\xed puede bifurcar el repositorio, use el bot\xf3n ",(0,n.jsx)(s.a,{href:"https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fdsanchezcr%2FLoadTestingDemo%2Fmain%2FARM%2Ftemplate.json",children:"Plantilla de ARM"}),"."]}),"\n",(0,n.jsxs)(s.blockquote,{children:["\n",(0,n.jsx)(s.p,{children:"Nota: Microsoft Azure solo le permite crear un recurso de capa gratuita de Cosmos DB por suscripci\xf3n, es posible que reciba un error si ya tiene una capa gratuita de Cosmos DB en su suscripci\xf3n."}),"\n"]}),"\n",(0,n.jsxs)(s.p,{children:["Este repositorio tiene un ",(0,n.jsx)(s.a,{href:"https://github.com/dsanchezcr/LoadTestingDemo/actions/runs/3745714572",children:"Acci\xf3n de GitHub"})," que compilan e implementan la aplicaci\xf3n y ejecutan la prueba de carga en Azure Load Testing."]}),"\n",(0,n.jsx)(s.p,{children:(0,n.jsx)(s.a,{href:"https://github.com/dsanchezcr/LoadTestingDemo/actions/runs/3745714572",children:(0,n.jsx)(s.img,{src:"/img/LoadTesting/GitHubActionRun.jpg",alt:"GitHub Action Run for Load Testing"})})}),"\n",(0,n.jsx)(s.h3,{id:"la-acci\xf3n-de-github",children:"La acci\xf3n de GitHub"}),"\n",(0,n.jsxs)(s.p,{children:["El ",(0,n.jsx)(s.a,{href:"https://raw.githubusercontent.com/dsanchezcr/LoadTestingDemo/main/.github/workflows/workflow.yml",children:"Flujo de trabajo"})," consta de tres pasos (compilaci\xf3n, implementaci\xf3n y pruebas de carga) y se ejecuta en cada inserci\xf3n. El trabajo de prueba de carga utiliza los siguientes archivos en la carpeta ra\xedz:"]}),"\n",(0,n.jsxs)(s.ul,{children:["\n",(0,n.jsx)(s.li,{children:(0,n.jsx)(s.a,{href:"https://github.com/dsanchezcr/LoadTestingDemo/blob/main/LoadTestingScript.jmx",children:"LoadTestingScript.jmx"})}),"\n",(0,n.jsx)(s.li,{children:(0,n.jsx)(s.a,{href:"https://github.com/dsanchezcr/LoadTestingDemo/blob/main/LoadTestingConfig.yaml",children:"LoadTestingConfig.yaml"})}),"\n"]}),"\n",(0,n.jsxs)(s.p,{children:["El inicio de sesi\xf3n de Azure es necesario para comunicarse con el servicio Azure Load Testing para enviar el script de JMeter y la configuraci\xf3n de la prueba. En esta configuraci\xf3n podemos definir el n\xfamero de ",(0,n.jsx)(s.a,{href:"https://learn.microsoft.com/azure/load-testing/concept-load-testing-concepts#test-engine?WT.mc_id=DT-MVP-5005361",children:"motores"})," Queremos ejecutar la prueba y los criterios de fallo, en este caso tenemos un tiempo de respuesta promedio inferior a 5 segundos y un porcentaje de error inferior al 20%."]}),"\n",(0,n.jsx)(s.h3,{id:"los-resultados",children:"Los resultados"}),"\n",(0,n.jsxs)(s.p,{children:["Como puedes ver en la imagen de arriba, la prueba de carga ",(0,n.jsx)("strong",{children:"fracasado"})," dado que el tiempo de respuesta promedio fue superior al umbral (5 segundos), podemos obtener m\xe1s detalles sobre la ejecuci\xf3n de la prueba en el Portal de Azure. ",(0,n.jsx)(s.a,{href:"https://raw.githubusercontent.com/dsanchezcr/LoadTestingDemo/main/engine1_results.csv",children:"Puedes descargar los resultados aqu\xed"}),"."]}),"\n",(0,n.jsx)(s.p,{children:(0,n.jsx)(s.img,{src:"/img/LoadTesting/TestResult.jpg",alt:"Test Results from Azure Load Testing"})}),"\n",(0,n.jsxs)(s.p,{children:["En el Servicio de aplicaciones de Azure, podemos ver las m\xe9tricas con los tiempos de respuesta (superiores a 5 segundos) y el n\xfamero de solicitudes con los datos de entrada y salida.\r\n",(0,n.jsx)(s.img,{src:"/img/LoadTesting/AppServiceMetrics.jpg",alt:"Azure App Service Metrics"})]}),"\n",(0,n.jsx)(s.p,{children:"Adem\xe1s, agregu\xe9 Application Insights para monitorear la aplicaci\xf3n web, en el Portal de Azure podemos ver los problemas y errores de rendimiento."}),"\n",(0,n.jsx)(s.p,{children:(0,n.jsx)(s.img,{src:"/img/LoadTesting/AppInsightsPerformance.jpg",alt:"Application Insights"})}),"\n",(0,n.jsx)(s.p,{children:"En la imagen de arriba puede ver de d\xf3nde provienen las solicitudes, en este caso estoy ejecutando Azure Load Testing en la regi\xf3n Este de EE. UU. (Virginia)."}),"\n",(0,n.jsx)(s.p,{children:(0,n.jsx)(s.img,{src:"/img/LoadTesting/AppInsightsFailures.jpg",alt:"App Insights Failures"})}),"\n",(0,n.jsx)(s.h2,{id:"conclusiones",children:"Conclusiones"}),"\n",(0,n.jsxs)(s.p,{children:["Las pruebas de carga ",(0,n.jsx)("strong",{children:"no debe ser"})," ejecut\xe1ndose en un entorno de producci\xf3n, pru\xe9belo en un control de calidad o preproducci\xf3n. Incluso si se ejecuta en ranuras de implementaci\xf3n, recuerde que la aplicaci\xf3n seguir\xe1 ejecut\xe1ndose en el mismo plan del Servicio de aplicaciones, lo que podr\xeda afectar al entorno de producci\xf3n o provocar un ",(0,n.jsx)(s.a,{href:"https://en.wikipedia.org/wiki/Denial-of-service_attack",children:"Ataque de denegaci\xf3n de servicio"}),"."]}),"\n",(0,n.jsxs)(s.p,{children:["Si desea obtener m\xe1s informaci\xf3n sobre Azure Load Testing, le recomiendo que revise el ",(0,n.jsx)(s.a,{href:"https://learn.microsoft.com/azure/load-testing?WT.mc_id=DT-MVP-5005361",children:"Documentaci\xf3n de servicio"}),"."]})]})}function u(e={}){const{wrapper:s}={...(0,i.a)(),...e.components};return s?(0,n.jsx)(s,{...e,children:(0,n.jsx)(l,{...e})}):l(e)}},1151:(e,s,a)=>{a.d(s,{Z:()=>t,a:()=>o});var n=a(7294);const i={},r=n.createContext(i);function o(e){const s=n.useContext(r);return n.useMemo((function(){return"function"==typeof e?e(s):{...s,...e}}),[s,e])}function t(e){let s;return s=e.disableParentContext?"function"==typeof e.components?e.components(i):e.components||i:o(e.components),n.createElement(r.Provider,{value:s},e.children)}}}]);