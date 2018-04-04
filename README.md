# JSduino  
JSduino v0.1.0
by GuerraTron  
2018@<dinertron@gmail.com>

## INTRO: ##

*'JSduino web-app' es un estupendo simulador de Arduino en JS.*

Esta aplicación web permite probar virtualmente proyectos Arduino ahorrandonos el montaje y beneficiandonos de la inmediatez que nos permite 'javascript'. En cuestión de minutos podemos visualizar como se comportaría nuestro prototipo real antes de empezar el montaje, ofreciendonos una idea de como acometerlo de la mejor manera y qué funciones necesitaríamos implementar.

Esta aplicación está orientada a desarrolladores que se encuentren más cómodos (como Yo mismo) implementando soluciones en javascript. JS es mucho más flexible y fácil de utilizar que 'C' (mi opinión) y, aunque no es lo mismo, pueden optenerse resultados similares frente a desafíos de desarrollo.

El inconveniente es que Arduino se programa en 'C', y para un programador 'javascript' puede costar bastante encontrar una solución directa en este lenguage. Ahí es donde puede resultar ventajoso (*para mí lo ha sido*) utilizar un **intermediario de pruebas** . Una vez encontremos el comportamiento buscado mediante 'javascript' no es tan difícil '*transpilarlo*' a 'C' como habría sido codificarlo diréctamente en este lenguage.
A algunos programadores puede ahorrarles muchas horas de código.

### DESCRIPCIÓN: ###

JSduino - simulador de ARDUINO en JS.

JSduino es una web-app escrita en '*JavaScript*' que emula una placa arduino (*UNO R3*) con la representación de sus pines de entrada y salida, y la posibilidad de la inserción de botones que actúan sobre esos pines. Estos botones son actuadores que pueden comportarse como Interruptores, pulsadores NO, pulsadores NC, conmutadores, ... o también receptores como LEDs y sensores.

En la app pueden seleccionarse dispositivos que actúen sobre los diversos pines de la placa para ver en tiempo real los distintos estados de los pines en función del código introducido y las acciones sobre esos actuadores.

La placa *UNO* representada es **interactiva**, parece real, permitiendo actuar sobre cada pin individualmente, ver su estado, los leds internos e incluso el botón *reset* reacciona a los eventos de usuario.

### OBJETIVO: ###

El objetivo de esta aplicación es ser un paso previo a la construcción de un prototipo real con arduino, trabajando de forma *virtual* ahorrandonos así horas de montaje sobre la placa.
Este proyecto no implementa todas las funciones Arduino al completo, tampoco admite plugins. Esta app nació para evaluar de forma rápida cómo se comportaría la placa *UNO R3* frente a desafíos sencillos de programar. 

No está pensado para entornos productivos, más bien como herramienta de pruebas para ayudarnos en los primeros pasos del desarrollo de un proyecto *Arduino* real; antes de implementarlo de forma física en una placa, puede ayudarnos a depurar el algoritmo a utilizar, visualizando las respuestas de este a través de las entradas y salidas en dispositivos virtuales (botones, pulsadores, leds, ..), sin tener que cablear nada.

### INTERFACE: ###

La *UI* representa una placa '*Arduino UNO R3*' interactiva, y entorno a ella una serie de zonas:

  - Zona Dispositivos: Representa los dispositivos disponibles para su utilización, cada uno de ellos presenta distintas características pudiendo ser de entrada o salida, y admitiendo valores analógicos o digitales: *Interruptor, Pulsador NO, Pulsador NC, Sensor, LEDs, Display*. Debe estar seleccionado uno de ellos antes de pulsar sobre el pin deseado.

  - Zona Actuadores: Tanto actuadores como receptores, representa los dispositivos atacando a pines que se utilizarán en nuestro circuito. Son interactivos y permiten su manipulación tanto con acciones de usuario como programáticamente a través del código.

  - Zona Botones: Alberga las distintas acciones permitidas en la placa. Desde la ejecución del código hasta el guardado de los estados y objetos actuales en la sesión. *Run/Pause, ReLoad State, Save, Delete, View State, y los botones de código*.

  - Zona Consola: Representa una simulación de lo que sería el **Monitor** en *Arduino* . Se maneja a través de mensajes enviados desde el propio código a través del objeto *'Serial'*.

  - Zona Mensajes: Esta zona se ha implemnetado para posibles ampliaciones, de momento no se utiliza.
  
Los botones de código permiten acceder a las tres áreas separadas: *Global, Setup y Loop* . Estamos hablando de código, POR SUPUESTO, escrito en lenguage '**javascript**' válido.  
En el área Global se introduciría el código fuera de las funciones *setup() y loop()* del **IDE Arduino**, tanto definición de variables como funciones de usuario.

Debido a la naturaleza **JS**, hay sensibles modificaciones con respecto al código que escribiríamos en lenguage '*C*'. Todas las variables globales a definir deben tratarse como propiedades de un objeto global llamado **'V'**, de tal forma que para definir una variable como *'var pin02 = 2;'* debe implementarse como *'V.pin02 = 2;'*, sinó se tratará como local.

Las funciones personalizadas o de usuario estarán disponibles inmediatamente en cualquier área de código (*Global, Setup o Loop*) sin depender del objeto global **'V'**, aunque también podrían definirse como métodos de este objeto.

Se han implementado las principales funciones propias del *IDE Arduino*: *pinMode, digitalRead, digitalWrite, analogRead*, ... e incluso la parte del objeto *'Serial'* que se comunica con el monitor de consola.

#### A TENER EN CUENTA: ####

Esto es una aproximación al comportamiento del código en una placa *Arduino* real, no quiere decir que sea exactamente igual, pero puede ofrecernos una idea muy aproximada.

**ATENCIÓN**: La función *'delay(..)'* se aconseja **no utilizarla** en la medida de lo posible, pues lo que hace es *'congelar la ejecución del motor JS'*. Esto se debe a la propia naturaleza Javascript como lenguage que no es *multi-hilo*, donde no tiene sentido detener el motor ya que puede ocasionar que toda la *UI* se detenga durante un lapsus de tiempo, impidiendo la respuesta del sistema en acciones de usuario como presionar un botón.  
Hay que buscar alternativas a pausar el código, de tal forma que un ejemplo BLINK comunmente escrito como:

<code>
//BLINK TRADICIONAL:  
digitalWrite(5, "LOW");  
delay(2000);  
digitalWrite(5, "HIGH");  
delay(2000);
</code>

podría implementarse como: 

<code>
//ALTERNATIVA:  
V.on = !V.on;  
digitalWrite(5, V.on ? HIGH : LOW);  
delay(2000);
</code>

### UTILIZACIÓN: ###
  Además de cargarse el API JSduino mediante su etiqueta correspondiente en el 'head' de la página, antes deberían cargarse dos archivos genéricos que utiliza profúsamente toda la API, uno es *'UTILS.js'* y otro la librería *'Raphael-JS'*:  

    <script type="text/javascript" src="UTILS.js"></script>
    <script type="text/javascript" src="raphael.js"></script>
    <script type="text/javascript" src="API/JSduino.js"></script>

Se necesita inicializar mediante una etiqueta 'script':  

    <script type="text/javascript">
        //INICIALIZACIÓN JSduino
        JSduino.init(document.getElementById("containerSVG"));
    </script>
    
El método de inicialización '**init(..)**' admite hasta tres parámetros: el elemento contenedor, un objeto con opciones de tamaño de la placa y un objeto de dispositivos a emplear. Un ejemplo de estos parámetros podrían ser:

   - Container: [DOMElement]

        document.getElementById("containerSVG")

   - Size: [Object JS]

        {width: 555/2, height:432/2, viewBox: {x:0, y:0, w:212, h:162}}

   - objActuators: [Object json] Representa un estado de dispositivos con el que empezar a trabajar:

        {"INPUT":{"id":"buttonsInput", "caption":"ENTRADAS:<br />", "className":"actuators input", "list":[{"type":"switcher","mode":"INPUT","family":"ANALOG","id":"A0","value":1,"className":"actuator"}, {"type":"switcher","mode":"INPUT","family":"DIGITAL","id":"6","value":0,"className":"actuator"}, {"type":"switcher","mode":"INPUT","family":"ANALOG","id":"A3","value":0,"className":"actuator"}]}, "OUTPUT":{"id":"buttonsOutput","caption":"SALIDAS:<br />", "className":"switches output", "list":[{"type":"ledBlue","mode":"OUTPUT","family":"DIGITAL","id":"8","value":1,"className":"actuator"}, {"type":"switcher","mode":"OUTPUT","family":"DIGITAL","id":"5","value":0,"className":"actuator"}]}}

El API JSduino se encarga de generar toda la estructura HTML y de cargar los estilos, así como de asignar el comportamiento js para toda la interfaz.  
Es interesante resaltar que la placa es representada con una imagen *SVG* generada *'al vuelo'* mediante el script **Raphael-JS** que le otorga el dinamismo y la interactividad necesaria.

>"Para ver la estructura HTML generada por esta aplicación puede verse el archivo '**struct.html**' "

##### AGRADECIMIENTOS: #####
Gracias al autor de la librería *'Raphael-JS'*, una genial librería para el manejo y efectos en archivos SVG.
Internamente contiene otras dependencias para el parseado y resaltado del código como: *'acorn, escodegen y edit-area'*, muchas gracias a los autores de estas estupendas librerías.
