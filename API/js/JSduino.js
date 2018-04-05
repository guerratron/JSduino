/*  
    "JSduino": Arduino en Javascript.
    by: Juan José Guerra Haba (guerraTron). 4-01-2018. <dinertron@gmail.com>
    Trabaja dentro del namespace "JSduino"
    necesita las librerías externas: 
    "raphael.js", "acorn.js + walk.js", "escodegen.js" y "edit_area.js"
    además de los scripts de estilo y el svg de la placa.
*/
/*
... para detalles en profundidad ver archivo 'readme.md'

EXPLICATIVO::
-------------
API JSduino modelado como 'app-web' para la construcción y manejo de un sistema virtual 'Arduino' en el browser.
Es auto-suficiente, se encarga de toda la construcción de la interfaz y de la lógica, así como de la carga
de los scripts necesarios para su funcionamiento. Busca un óptimo redimensionado para que ocupe el máximo de ventana.

La interfaz se ha dotado con la posibilidad de incluir algunos elementos llamados 'actuadores' (actuadores, receptores, 
indicadores, ...), que nos posibilitan dar y recibir valores a los distintos pines de la placa para una interacción 
gráfica que nos demuestra visualmente el funcionamiento de nuestro código.

Tenemos CUATRO ventanas de representación del código, TRES donde se irá escribiendo código tal cual lo haríamos en el IDE 
Arduino (aunque de momento sólo en lenguage 'javascript') incluso utilizando las propias funciones Arduino, separadas en 
zonas Global, Setup y Loop. Otra es la ventana de salida de la consola, que emula precisamente eso, un monitor de consola 
Arduino.

La placa es totalmente operativa de forma que incluso sus 'leds' indican el estado real de ella en cada momento, así 
como el botón de Reset es interactivo y produce el resultado esperado.

OBSERVACIONES::
---------------
Por motivos méramente visuales, se ha ralentizado INTENCIONALMENTE los ciclos de ejecución del código escrito; por un 
lado para permitir el visionado de los resultados y por otro, faltaría más, porque el ordenador es infinitamente más veloz 
que cualquier placa Arduino. 

Dicho esto hay que puntualizar que esto es una emulación con el propósito de facilitar el desarrollo, no una herramienta final; 
se supone que tras testar nuestro código pasaremos a la fase de construcción real del prototipo con el IDE Arduino.

GRACIAS::
---------
Utiliza el fantástico script 'raphael.js' para la construcción del 'svg' y algunos efectos. Muchas gracias 
a 'Dmitry Baranovskiy' (http://dmitry.baranovskiy.com/); el cual permite una compatibilidad sin precedentes 
desde: Firefox 3.0+, Safari 3.0+, Chrome 5.0+, Opera 9.5+ and Internet Explorer 6.0+.
Debido a esto sumamos otros cuantos kbts más pero ganamos en representación visual.

También mis agradecimientos a los desarrolladores de las librerías 'acorn y escodegen' que permiten parsear código javascript 
permitiendo crear un AST manipulable.

Y gracias a la API 'edit-area' con la que he podido mostrar las ventanas de código de forma más 'amigable'.

CARACTERÍSTICAS:
----------------
- Programación con filosofía POO. Se ha desarrollado por módulos, aunque finalmente se ha montado sobre un único archivo 'JSduino.js' 
  para facilitar la carga.
- Empleo de namespaces y closures.
- Ámbito global limpio. Sólo una variable global (jsvg) para el acceso al objeto 'svg' y un único namespace: 'JSduino'
- Autocarga de scripts necesarios. (css, svg, ...)
- Espera inteligente a la carga total de la página. (timers, 'DOMContentLoaded', ...)
- Simulación de funciones y características Arduino.
- Interfaz interactiva con efectos, sonidos.

PROBLEMAS Y COMO RESOLVERLOS::
------------------------------
//HAY QUE DARLE TIEMPO AL PARSEADOR PARA QUE PROCESE Y CARGUE EL ARCHIVO JS
//Si cargamos el script '*.svg.raphael.js' mediante una etiqueta normal al final del 'body' no nos daría problemas, pero
//al cargarlo 'dinamicamente' en la función 'init' de 'JSduino' se realiza una pseudo-recarga que nos impide trabajar adecuadamente
//dentro del evento 'DOMContentLoaded'. 
//Por eso todo lo que sea intentar acceder al objeto 'jsvg' necesitamos ralentizarlo con un 'timer'.
/ *
setTimeout(function(){
   var paper = jsvg;
   //REDIMENSIONAMOS EL OBJETO RAPHAEL:
   paper.setSize("555", "432"); //raphael
   paper.setViewBox(0, 0, 212, 162, true);//raphael
   //JSduino.Raphael.scan();
}, 100);* /
*/

//NAMESPACE GLOBAL
var JSduino = (function (_JSduino_){
    "use-strict";
    
    //CONSTANTES DE TIEMPO PARA LOS TIMERs
    var _TICKS_INTERVAL = 1000, _TICKS_INIT = 100, _TICKS_CLEAR = 100, _START_DELAY = 800; //msg.;
    //MUTE SOUNDS
    var _PLAY_SOUNDS_ = true;
    var mute = !_PLAY_SOUNDS_;
    //OBJETO QUE DEFINE LOS DISPOSITIVOS A UTILIZAR
    /* Son atributos de objetos DOMElements que deben corresponderse más o menos fielmente con la constante 
     * definida en 'JSduino.Actuator' :: 'actuatorTypes', aunque estos últimos se refieran a objetos javascript; donde
     * 'data' se correspondería con 'name', y 'src' con 'imgs' más o menos. */
    var objectDevices = [
        {
            types: [],
            modes: ["INPUT", "OUTPUT"],
            attrs: {type: "li", data: "switcher", title: "Interruptor [INPUT]"}, 
            children: [{attrs: {type: "img", src: "API/images/actuators/switcher_v_off.png", alt: "Interruptor"}}]
        },
        {
            types: [],
            modes: ["INPUT", "OUTPUT"],
            attrs: {type: "li", data: "buttonNO", title: "Pulsador Normalmente Abierto (NO) [INPUT]"}, 
            children: [{attrs: {type: "img", src: "API/images/actuators/button_v_off.png", alt: "Pulsador NO"}}]
        },
        {
            types: [],
            modes: ["INPUT", "OUTPUT"],
            attrs: {type: "li", data: "buttonNC", title: "Pulsador Normalmente Cerrado (NC) [INPUT]"}, 
            children: [{attrs: {type: "img", src: "API/images/actuators/button_v_on.png", alt: "Pulsador NC"}}]
        },
        {
            types: [],
            modes: ["INPUT", "OUTPUT"],
            attrs: {type: "li", data: "sensor", title: "Dispositivo analógico, sensor, medidor, interruptor lineal, ... [INPUT]"}, 
            children: [{attrs: {type: "img", src: "API/images/actuators/lineal_5.png", alt: "Sensor"}}]
        },
        {
            types: [],
            modes: ["INPUT", "OUTPUT"],
            attrs: {type: "li", data: "led", title: "Dispositivo luminoso [OUTPUT]"}, 
            children: [
                {attrs: {type: "img", src: "API/images/actuators/led_red.png", alt: "led"}},
                {
                    attrs: {type: "select", id: "deviceColor", alt: "Seleccionar el color del led"},
                    children:  [
                        {attrs: {type: "option", value: "White", inner: "Blanco"}},
                        {attrs: {type: "option", value: "Red", inner: "Rojo"}},
                        {attrs: {type: "option", value: "Green", inner: "Verde"}},
                        {attrs: {type: "option", value: "Blue", inner: "Azul"}},
                        {attrs: {type: "option", value: "Orange", inner: "Naranja"}},
                        {attrs: {type: "option", value: "Yellow", inner: "Amarillo"}}
                    ]
                }
            ]
        },
        {
            types: [],
            modes: ["INPUT", "OUTPUT"],
            attrs: {type: "li", data: "display", title: "Dispositivo Pantalla [OUTPUT]"}, 
            children: [{attrs: {type: "img", src: "API/images/actuators/display_on.png", alt: "Display"}}]
        }
    ];
    
    var objectActuators = {};
    
     //NOMBRE DE LA VARIABLE JAVASCRIPT QUE APUNTA AL 'CANVAS-PAPER' DEL OBJETO RAPHAEL QUE CONTIENE EL 'SVG'
    var _PAPER_RAPHAEL_ = 'jsvg';   //Debe ser la misma que la definida en el propio objeto '*.svg.raphael.js'
    var _ID_SVG_ = "contSVG";       //Id del contenedor. Debe ser el mismo que el que aparece en el propio objeto '*.svg.raphael.js'
    //var scriptUTILS = 'API/js/UTILS.js';
    var styleCSS = 'API/css/JSduino.css';
    var scriptRaphael = 'js/raphaeljs/raphael.min.js';
    var scriptSVGRaphael = "API/js/board/Arduino-VIII-SVGOMG.svg.raphael.js"; //ruta+nombre del script '*.svg.raphael.js";
    //var modulePreload = 'API/js/modules/JSduino.preload.js';
    var scriptAcorn = 'js/AST/acorn/acorn.es.browser.js';
    var scriptWalk = 'js/AST/acorn/walk.es.browser.js';
    var scriptEscodegen = 'js/AST/escodegen/escodegen.browser.min.js';
    //var styleEditArea = 'js/editarea/edit_area.css';
    var scriptEditArea = "js/editarea/edit_area_full.js";
    /*var modulesArray = [    //NO PUEDE UTILIZARSE, DA PROBLEMAS POR LA EJECUCIÓN EN LA CARGA
        //'../UTILS/UTILS.js',
        //'API/js/raphaeljs/raphael.min.js',
        //'API/js/modules/JSduino.js',
        'API/js/modules/JSduino.preload.js',
        'API/js/modules/JSduino.utils.js',
        'API/js/modules/JSduino.ui.js',
        'API/js/modules/JSduino.core.js',
        'API/js/modules/JSduino.events.js',
        'API/js/modules/JSduino.effects.js',
        'API/js/modules/JSduino.raphael.js',
        'API/js/modules/JSduino.SVG.js',
        'API/js/modules/JSduino.Pin.js',
        'API/js/modules/JSduino.Actuator.js'];*/
    var raphael_groups = null; //Variable definida en el archivo '*.svg.raphael.js'
        
    //VARs
    var devices = []; //{"id": attrs.data, "name": attrs.data, "el": el} //[{"name": attrs.data, "el": el}, {...}, ...]
    var deviceSel = null;
    var actions = []; //[{"id": "runPause": "el": btnRunPause}, {...}, ...]
    var actuators = []; //{id: id, act: new _JSduino_.Actuator(pin, typeDevice)}
    var leds = [], ledders = [], glows = [];
    var pines = []; //{id: id, pin: pin}
    var pinsGroups = []; //{id: p, group: groups[p]}
    var ledPower = null;
    var JSduinoContainer = null, containerParent = null;
    //ÁREAS PARA EL CÓDIGO: GLOBAL, SETUP Y LOOP EN PRINCIPIO
    var areas = ["Global", "Setup", "Loop"];
    //var _PINS_CREATED_ = {};
    //UTILIZABLE EN JSduino.ino::
    /** Array de los pines configurados a través de la función 'pinMode', que son los habilitados (en principio) para el códdigo.
      * Una vez configurado el pin en la zona 'setup' no debería permitirsele reconfigurarse en otra parte del código, se le 
      * debe mantener el modo establecido de inicio. */
    var pinModeArray = [/*{id: 0, el: null, mode: null}*/];
    //TIMERs
    var timers = [];
    var timeouts = [];
    //LISTENERs
    var listeners = [/*{el: DOMElement, eventType: 'click', handler: function_handler, bubble: true}*/];
    var initied = {isInitied: false};
    var btnLoad = null;
    
    
    //STATICs INTERNAL FUNCTIONS
    /** Obtiene los datos almacenados en el elemento LI (BOTÓN-ACTUADOR). 
      * Normalmente un array con el valor y el estado. (0 = select.value, 1= HIGH|LOW)
      * El VALUE indica el número de pin asociado al botón, el STATE especifica si se
      * encuentra en estado alto o bajo (HIGH | LOW) 
      * @param li [HTMLLiElement] El BOTÓN-ACTUADOR del que obtener los datos.
      * @return data [Array] Un Array (extraido del formato cadena) con los datos almacenados, 
      * donde; data[0]=VALUE y data[1]=STATE. */
    function getData(li){
        return (li.data ? li.data.split(":") : null); //0 = select.value, 1= HIGH|LOW
    }
    /** Establece los datos a almacenar en el elemento LI (BOTÓN-ACTUADOR). 
      * Se guardará en forma de un array con formato texto, con el valor y el 
      * estado. (0 = select.value, 1= HIGH|LOW)
      * El VALUE indica el número de pin asociado al botón, el STATE especifica si se
      * encuentra en estado alto o bajo (HIGH | LOW)
      * @param li [HTMLLiElement] El BOTÓN-ACTUADOR al que añadir los datos.
      * @param value [String] La cadena que representa el número de pin asociado.
      * @param state [String] Una cadena representando el estado: HIGH, LOW.
      * @return data [String] Una cadena (Array con formato cadena) con los datos almacenados. */
    function setData(li, value, state){
        li.data = (value + ":" + state);
        return li.data;
    }
    function optionDisable(option, disable){
        option.disabled = disable;
        option.style.background = (disable ? "red" : "none");
    }
    function getContainer(){ return JSduinoContainer; }
    
    /** Se utiliza para cargar una configuración previamente guardada a través del objeto 'objectActuators' que 
      * debe tener una estructura muy definida tal que así: 
        objectActuators = 
        {
          INPUT:{ //UL ACTUADORES (INPUT, OUTPUT, LEVEL)
                    id:        "buttonsInput",
                    caption:   "ENTRADAS:<br />",
                    className: "actuators input",
                    list: [   //lis
                            { //li actuator
                                type:      "switcher", //switcher, pulse, button, buttonNO, buttonNC, sensor, led, ledWhite, ledRed, ...
                                family:    "DIGITAL",  //DIGITAL, ANALOG, POWER, AVR, SERIAL, SPI, I2C, PWM, INTERRUPT
                                id:        "8",        //"hole_8",
                                txt:       "AC-DC",
                                value:     1,
                                className: "actuator"
                            },
                            {...}
                          ]
                },
           ...
        }
    */
    function reloadOldState(){
        if(!_JSduino_.ui.containers.Root){ return null; }
        var paper = _JSduino_.getPaper();
        btnLoad =  getGetSaved("chkLoad"); //_JSduino_.core.loadStore(2); //getGetSaved("btnLoad");
        //Obtenemos el posible objeto 'objActuators' enviado por post.
        var objActuatorsSaved = btnLoad ? _JSduino_.core.loadStore(1) : null; //getPostSaved();
        //Lo insertamos en el array general
        var objActuatorsAll = [objActuatorsSaved, objectActuators];
        //Los procesamos, de tal forma que le damos prioridad a los pasados a través del método init()
        for(var x=0; x<objActuatorsAll.length; x++){
            var objAct = objActuatorsAll[x];
            if(!objAct){ continue; }
            for(var mode in objAct){
                if(objAct.hasOwnProperty(mode)){
                    var obj = objAct[mode];  //obj.id, obj.caption, obj.className, obj.list
                    for(var i=0; i<obj.list.length; i++){ //list
                        var act = obj.list[i];          //act.id, act.type, act.mode, act.value, act.txt, act.className
                        deviceSel = act.type;
                        var pin = _JSduino_.utils.getPinCompatible(act.id, [mode]); //Si hay alguno aprovechable se utiliza
                        //Si no se encuentra se crea uno nuevo
                        pin = pin ? pin : new _JSduino_.Pin(act.id, mode, null, null, true); //modo estricto
                        if(!pin || pin.error){
                            if(pin && pin.remove) { console.log("reloadOldState:: Borrado el pin temporal?... !" + (pin.remove() + "").toUpperCase() + "¡"); } //lo suprime del array genérico
                            pin = null;
                            toC("ERROR en reloadOldState:: pin [" + act.id + "], Modo = '" + mode + "'. ¡ID o MODO erróneo!");
                            return null;
                        }
                        if(pin.mode !== mode) { pin.setMode(mode); }
                        pin.er.attr("fill", "white"); //LO SEÑALA COMO ESTABLECIDO
                        pin.setValue(0); //lo resetea
                        if(!_JSduino_.ino.getPinModeArrayById(pin.id)){ pinModeArray.push({id: pin.id, el: pin, mode: pin.mode}); }
                        console.log("reloadOldState():: pin [" + pin.id + "] == '" + pin.pinDef.aka + "', setted to Mode = '" + pin.mode + "'");
                        //... fin de líneas en pinMode.
                        if(pin){
                            var actNew = new _JSduino_.Actuator(pin, act.type);
                            if(actNew && actNew.pin && actNew.inputName && actNew.structure){
                                //pines.push({id: actNew.pin.id, pin: actNew.pin});
                                actNew.name = act.txt;
                                actNew.text = act.txt;
                                actNew.inputName.value = act.txt;
                                actNew.notify(act.value);
                                actNew.highlight(true);
                                //actuators.push({id: act.id, act: actNew}); //ya lo hace la propia clase Actuator
                            } else {
                                actNew.remove();
                                actNew = null;
                                //pin.remove();
                                pin = null;
                            }
                        }
                    }
                }
            }
        }
    }
    /**/
    function getGetSaved(name){
        var cadVariables = location.search.substring(1,location.search.length); //suprimimos ?
        var arrVariables = cadVariables.split("&");
        for (i=0; i<arrVariables.length; i++) {
            var partes = arrVariables[i].split("=");
            if(partes[0] == name){
                //return JSON.parse(partes[1]);
                return partes[1];
            }
        }
        return null;
    }
    
    /** Establece el tamaño del canvas 'paper' SVG de JSduino.
      * @param size {Object} Objeto de dimensiones para el 'paper' mostrado: {width: 360, height:240, viewBox: {x:0, y:0, w:260, h:320}}*/
    function setSize(size){
        size = size ? size :  {}; //{width: 555, height:432, viewBox: {x:0, y:0, w:212, h:162}};
        var defaultWidth = 283, defaultHeight = 202, paper = _JSduino_.getPaper();
        if(!paper){ return null; }
        var width = size.width ? size.width : paper.width;
        width = width ? width : defaultWidth;
        var height = size.height ? size.height : paper.height;
        height = height ? height : defaultHeight;
        var viewBox = size.viewBox ? size.viewBox : paper.viewBox;
        //viewBox = viewBox ? viewBox : defaultViewBox;
        if(!viewBox){ //"0 0 " + (svgWidth/1.3) + " " + (svgHeight/1.3);
            viewBox = { x: 0, y: 0, w: (width/1.3), h: (height/1.3) };
        }
        //REDIMENSIONAMOS EL OBJETO RAPHAEL:
        paper.setSize(width*2, height*2); //raphael
        paper.setViewBox(viewBox.x, viewBox.y, viewBox.w, viewBox.h, true);//raphael
    }

    function loadModules(pathArray, container, firstChild, attrs, callback ){
        _JSduino_.utils.loadScript(pathArray.shift(), container, firstChild, attrs, callback);
        if(pathArray.length > 0){ loadModules(pathArray, container, firstChild, attrs, callback ); }
    }
    
    function insertAfter(el, ref){
        var sibling = ref.nextSibling;
        var parent = ref.parentNode;
        parent.insertBefore(el, sibling);
    }
    
    /** Método Principal. Función de arranque y construcción de todo el sistema JSduino.
      * Se embebe en el interior del evento 'DOMContentLoaded'.
      * @param container {DOMElement} [OBLIGATORIO] Elemento del DOM contenedor de toda la interfaz JSduino. 
      * @param size {Object} Objeto de dimensiones para el 'paper' mostrado: {x:0, y:0, w:260, h:320}
      * @param objActuators {Object} Objeto con una estructura muy definida. (ver 'objectActuators')*/
    function init(container, size, objActuators){
        //UTILS
        //_JSduino_.utils.loadScript(scriptUTILS, null, true, {type: "text/javascript", async: true, defer: true}); //HEAD
        //JSduino - CSS
        _JSduino_.utils.loadStyle(styleCSS, null, true, {type: "text/css", rel: "stylesheet"}); //HEAD
        //EDIT-AREA
        _JSduino_.utils.loadScript(scriptEditArea, null, false, {type: "text/javascript", async: true, defer: true}); //HEAD
        //RAPHAEL SVG
        _JSduino_.utils.loadScript(scriptRaphael, document.body, false, {type: "text/javascript", async: true, defer: true}); //BODY
        //_JSduino_.utils.loadScript(scriptSVGRaphael, document.body, false, {type: "text/javascript", async: true, defer: true}); //BODY
        //ACORN
        _JSduino_.utils.loadScript(scriptAcorn, null, false, {type: "text/javascript", async: true, defer: true}); //HEAD
        //WALK
        //_JSduino_.utils.loadScript(scriptWalk, null, false, {type: "text/javascript", async: true, defer: true}); //HEAD
        
        //ESCODEGEN
        _JSduino_.utils.loadScript(scriptEscodegen, null, false, {type: "text/javascript", async: true, defer: true}); //HEAD
        
        _JSduino_.events.addEvent(null, null, function ready(){
            
            //RAPHAEL SVG
            //_JSduino_.utils.loadScript(scriptSVGRaphael, document.body, false, {type: "text/javascript", async: true, defer: true}); //BODY
            var script = document.createElement("script");
            script.src = scriptSVGRaphael;
            script.type = "text/javascript";
            insertAfter(script, container);
            //UI
            JSduinoContainer = containerParent = container;
            container.appendChild(_JSduino_.ui.makeUI());
            
            container.classList.add("containerSVG");
            toDo(_JSduino_.raphael.scan, null , 80); //espera que se cargue el script externo para incorporar su nombre de variable raphael 'jsvg' (paper)
            toDo(setSize, size, 100);
            //if(objActuators) { 
                objectActuators = objActuators;
                toDo(reloadOldState, null ,120);
            //}
            toDo(function(){ _JSduino_.core.init(true); }, null, 140);
            
            //EDIT-AREA
            toDo(function(){ _JSduino_.editArea = editAreaLoader; }, 160);
        });
    }

    /** Encapsula la función a realizar en un 'timeout' con un tiempo configurable de espera (por defecto 100 msg.); 
      * también se le pueden entregar parámetros a la función.
      * Este método es el que debe emplearse fuera de JSduino para la ejecución de código, pues asegura un tiempo mínimo 
      * de espera para permitir que se haya cargado toda la interfaz. */
    function toDo(paramFunction, params, millis){
        setTimeout(paramFunction, (millis ? millis : 100), params);
    }
    function preSetup(param_func, params_others){
        _JSduino_.core.preSetup(param_func, params_others);
    }
    function setup(param_func, params_others){
        _JSduino_.core.setup(param_func, params_others);
    }
    function loop(param_func, params_others){
        _JSduino_.core.loop(param_func, params_others);
    }
    
    //PUBLIC API:
    Object.assign(_JSduino_, 
    {
        _PAPER_RAPHAEL_: _PAPER_RAPHAEL_, //CONSTANTE ACCESIBLE DESDE EL RESTO DE MÓDULOS. Es el nombre de la variable que engloba el objeto Raphael.
        _ID_SVG_: _ID_SVG_, //CONSTANTE ACCESIBLE DESDE EL RESTO DE MÓDULOS. Es el id del contenedor que engloba el objeto Raphael.
        //RSVG: p_txt_mail,
        //editArea: editAreaLoader, //NECESITA edit_area.js
        getLogo: function(){ return _JSduino_.objects.images.logo; },
        getImages: function(){ return _JSduino_.objects.images; },
        getSounds: function(){ return _JSduino_.objects.sounds; },
        getMusics: function(){ return _JSduino_.objects.musics; },
        getMute: function(){ return mute; },
        setMute: function(what){ mute = what; },
        init: init, //punto de entrada principal del programa.
        //reInit: reInit, //regeneración de la interfaz
        toDo: toDo, //método normal para embeber todo el código HTML externo a ejecutar.
        preSetup: preSetup,
        setup: setup,
        loop: loop,
        V: function(){ return _JSduino_.core.V; },
        A: function(){ return _JSduino_.core.A; },
        objectDevices: objectDevices,
        objectActuators: objectActuators,
        deviceSel: deviceSel,
        setSize: setSize,
        getPaper: function(){ return _JSduino_.raphael.getPaper(); },
        getContainer: getContainer,
        getLedPower: function (){ return ledPower; },
        getAreas: function(){ return areas; },
        getCodeAreas: function(){ return _JSduino_.ui.containers.CodeAreas; },
        getIcons: function(){ return _JSduino_.ui.icons; },
        getActions: function (){ return actions; },
        getDevices: function (){ return devices; },
        getActuators: function (){ return actuators; },
        getPines: function (){ return pines; },
        getLeds: function (){ return leds; },
        getPinsGroups: function (){ return pinsGroups; },
        getGlows: function(){ return glows; },
        getLedders: function (){ return ledders; },
        getPinModeArray: function(){ return pinModeArray; },
        getTimers: function(){ return timers; },
        getTimeouts: function(){ return timeouts; },
        getListeners: function(){ return listeners; },
        getInitied: function(){ return initied; }
    });
    


    //BEGIN:: MÓDULO JSduino.utils
    /* Sub-Namespace 'utils' dentro del namespace 'JSduino'.
     * Trata distintos effectos para aplicar a elementos tanto de la 
     * interfaz gráfica de usuario como del propio 'core', pero que
     * sean 'Objetos-Raphael' */
    _JSduino_.utils = (function (){
        //FROM UTILS.js 
        /** Carga un link 'style' en el Padre indicado de la página, por defecto el HEAD.
          * Como atributos se admiten la ruta, el objeto padre donde insertarlo (HEAD, BODY, ...)
          * si incluirlo como primer hijo o no, un objeto de atributos, incluso una función de 
          * callback cuando termine de cargarlo. */
        function loadStyle (href, parent, firstChild, attrs, nameCallback) {
            if(!href) { return null; }
            attrs = attrs || {};
            parent = parent || document.getElementsByTagName("head")[0];
            
            // Crear elemento
            var style = document.createElement("link");
            // Atributos del script

            for(var a in attrs){
                if(attrs.hasOwnProperty(a)){
                    style.setAttribute(a, attrs[a]);
                }
            }
            if(nameCallback) { style.onload = nameCallback; }
            //if(nameCallback) { style.onload = "" + nameCallback + "()"; }
            //if(nameCallback) { href = href + "?callback=" + nameCallback +"&onclick=" + nameCallback}
            style.setAttribute("href", href);
            
            if(firstChild){ 
                parent.insertBefore(style, parent.firstChild);
            } else {
                parent.appendChild(style);
            }
            return true;
        }
        /** Carga un script en el Padre indicado de la página, por defecto el HEAD. 
          * Como atributos se admiten la ruta, el objeto padre donde insertarlo (HEAD, BODY, ...)
          * si incluirlo como primer hijo o no, un objeto de atributos, incluso una función de 
          * callback cuando termine de cargarlo.*/
        function loadScript (src, parent, firstChild, attrs, nameCallback) {
            if(!src) { return null; }
            attrs = attrs || {};
            parent = parent || document.getElementsByTagName("head")[0];
            
            // Crear elemento
            var script = document.createElement("script");
            // Atributos del script

            for(var a in attrs){
                if(attrs.hasOwnProperty(a)){
                    script.setAttribute(a, attrs[a]);
                }
            }
            if(nameCallback) { script.onload = nameCallback; }
            //if(nameCallback) { src = src + "?callback=" + nameCallback +"&onclick=" + nameCallback}
            script.setAttribute("src", src);
            
            if(firstChild){ 
                parent.insertBefore(script, parent.firstChild);
            } else {
                parent.appendChild(script);
            }
            return true;
        }
        /** Crea una etiqueta script en línea (no un archivo a cargar) en el Padre indicado de la página, por defecto el HEAD. 
          * Como atributos se admiten el código en javascript, el objeto padre donde insertarlo (HEAD, BODY, ...)
          * si incluirlo como primer hijo o no, un objeto de atributos, incluso una función de 
          * callback cuando termine de cargarlo.*/
        function createScript (code, parent, firstChild, attrs, nameCallback) {
            if(!code) { return null; }
            attrs = attrs || {};
            parent = parent || document.getElementsByTagName("head")[0];
            
            // Crear elemento
            var script = document.createElement("script");
            // Atributos del script

            for(var a in attrs){
                if(attrs.hasOwnProperty(a)){
                    script.setAttribute(a, attrs[a]);
                }
            }
            if(nameCallback) { script.onload = nameCallback; }
            //if(nameCallback) { src = src + "?callback=" + nameCallback +"&onclick=" + nameCallback}
            script.innerHTML = code;
            
            if(firstChild){ 
                parent.insertBefore(script, parent.firstChild);
            } else {
                parent.appendChild(script);
            }
            return true;
        }
        
        var Base64={_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/[^A-Za-z0-9\+\/\=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},_utf8_encode:function(e){e=e.replace(/\r\n/g,"\n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},_utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}};
        
        /**FROM MDM: https://developer.mozilla.org/es/docs/Web/JavaScript/Referencia/Objetos_globales/Math/max*/
        function getMaxOfArray(numArray) {
          return Math.max.apply(null, numArray);
        }
        /** Retorna el índice del valor más cercano en el array. El tercer parámetro nos permite indicar si deseamos
          * (en caso de igualdad) el más cercano hacia arriba, o hacia abajo; por defecto hacia arriba. */
        var getIndexFromNearest = function (value, arr, downUp) {
            var result = Math.abs(getMaxOfArray(arr)-value); //máx
            var index = -1;
            for(var i=0; i<arr.length; i++){
                var v = arr[i];
                var dif = Math.abs(v-value);
                var condicion = downUp ? (dif < result) : (dif <= result);
                if(condicion){
                    result = Math.abs(v-value);
                    index = i;
                }
            }
            return index;
        };
        /** FROM: MDM:: https://developer.mozilla.org/es/docs/Web/JavaScript/Referencia/Objetos_globales/Math/random
          * ENTERO:: Retorna un entero aleatorio entre min (incluido) y max <del>(excluido)</del>. ¡Usando Math.round() 
          * te dará una distribución no-uniforme! */
        function getRandomInt(min, max) {
            max += 0.0000000001; //Para que máx esté incluido
            var max2 = Math.max(max, min);
            var min2 = Math.min(max, min);
          return Math.floor(Math.random() * (max2 - min2)) + min2;
        }
        
        /** Retorna otro array con los resultados coincidentes en ambos arrays de entrada, osea, 
          * calcula su INTERSECCIÓN BOOLEANA. 
          * Este método realiza una operación BOOLEANA DE CONJUNTOS, NO realiza OPERACIONES MATEMÁTICAS, 
          * puesto que trata los arrays como conjuntos con elementos, no como valores matemáticos. 
          * Emplea 'indexOf' y el valor de retorno depende de lo que pueda comparar esta función javascript. */
        function arrIntersection(arr1, arr2){
            var arrResult = [];
            if(!arr1 || !arr2) { return arrResult; }
            for(var i=0; i<arr1.length; i++){
                if(arr2.indexOf(arr1[i]) > -1){ arrResult.push(arr1[i]); }
            }
            return arrResult;
        }
        /** Retorna otro array con los resultados NO coincidentes en ambos arrays de entrada, osea, 
          * calcula su DIFERENCIACIÓN BOOLEANA. 
          * Este método realiza una operación BOOLEANA DE CONJUNTOS, NO realiza OPERACIONES MATEMÁTICAS, 
          * puesto que trata los arrays como conjuntos con elementos, no como valores matemáticos. 
          * Emplea 'indexOf' y el valor de retorno depende de lo que pueda comparar esta función javascript. */
        function arrDiferenciation(arr1, arr2){
            var arrResult = [];
            if(!arr1 || !arr2) { return arrResult; }
            for(var i=0; i<arr1.length; i++){
                if(arr2.indexOf(arr1[i]) == -1){ arrResult.push(arr1[i]); }
            }
            return arrResult;
        }
        /** Suprime elementos duplicados en el array. No modifica el array entregado, retorna un nuevo array. */
        function unique(arr){
            return arr.filter(function (currentValue, index, array) {
                //try{ return (arr.slice(index+1).indexOf(currentValue) < 0); }catch(e){ return true; }
                if((index+1) < array.length) { return (array.slice(index+1).indexOf(currentValue) < 0); } else { return true; }
            });
        }
        /** Al igual que el método 'indexOf' busca valores conincidentes y retorna el índice, pero entre DOS ARRAYS. */
        function indexOfArray(arr1, arr2){
            var index = -1;
            if(!arr1 || !arr2) { return index; }
            arr1 = (arr1 instanceof Array) ? arr1 : [arr1];
            arr2 = (arr2 instanceof Array) ? arr2 : [arr2];
            for(var i=0; i<arr2.length; i++){
                if(arr1.indexOf(arr2[i]) > -1){ return i;/*index = i;*/ }
            }
            return index;
        }
        /** Retorna las claves (keys) principales de un objeto. */
        function objGetKeys(obj){
            var keys = [];
            for(var o in obj){
                if(obj.hasOwnProperty(o)){
                    keys.push(o);
                }
            }
            return keys;
        }
        //END UTILS.js
        
        /** Función de utilidad para limpiar el nombre pasado como parámetro para hacerlo compatible con un nombre de 
          * variable javascript, eliminando espacios y otros caracteres no válidos. Por ejemplo es útil para los atributos 
          * 'id' de los elementos que posteriormente se traducen a nombres de variables o propiedades de objetos. */
        function availableVarName(id){ return id.replace(/[\.\s\*-]/gi, id); }
        
        function getLedById(ledId){
            for(var i=0; i<leds.length; i++){
                var led = leds[i];
                if(ledId == led.id) { return led.el; }
            }
            return null;
        }
        function getActionById(actionId){
            for(var i=0; i<actions.length; i++){
                var action = actions[i];
                if(actionId == action.id) { return action.el; }
            }
            return null;
        }
        function getLedderById(ledderId){
            for(var i=0; i<ledders.length; i++){
                var ledder = ledders[i];
                if(ledderId == ledder.id) { return ledder.ledder; }
            }
            return null;
        }
        function getDeviceById(deviceId){
            for(var i=0; i<devices.length; i++){
                var device = devices[i];
                if(deviceId == devices.id) { return device.el; }
            }
            return null;
        }
        function getDeviceByData(deviceData){
            for(var i=0; i<devices.length; i++){
                var device = devices[i];
                var el = device.el;
                if(deviceData == el.getAttribute("data")) { return device; }
            }
            return null;
        }
        
        function getIndexActuatorById(actuatorId){
            for(var i=0; i<actuators.length; i++){
                var act = actuators[i];
                if(actuatorId == act.id) { return i; }
            }
            return null;
        }
        function getIndexPinById(pinId){
            for(var i=0; i<pines.length; i++){
                var pin = pines[i];
                if(pinId == pin.id) { return i; }
            }
        }
        function getActuatorById(actuatorId){
            for(var i=0; i<actuators.length; i++){
                var act = actuators[i];
                if(actuatorId == act.id) { return act.act; }
            }
        }
        function getPinById(pinId){
            for(var i=0; i<pines.length; i++){
                var pin = pines[i];
                if(pinId == pin.id) { return pin.pin; }
            }
        }
        /** Util en 'JSduino.ino', comprueba si este id de pin ya se encuentra establecido, 
          * si es así lo retorna, sinó retorna 'null'*/
        function getPinUsed(id){
            var pinModesArr = _JSduino_.getPinModeArray();
            for(var i=0; i<pinModesArr.length; i++){
                var pMode = pinModesArr[i];
                if(id == pMode.id){
                    return pMode.el;
                }
            }
            var pinActuators = _JSduino_.getActuators();
            for(var i=0; i<pinActuators.length; i++){
                var pAct = pinActuators[i].act;
                if(id == pAct.pin.id){
                    return pAct.pin;
                }
            }
            return null;
        }
        /** Util en 'JSduino.ino', trata de obtener un pin que ya se encuentre establecido con ese id, 
          * y que sea compatible con alguno de los modos propuestos; si es así lo retorna, sinó retorna 'null'.
          * Primero busca en los ya creados (y compatibles) por orden en el array de 'pinModes' y sinó en el 
          * de 'actuators'*/
        function getPinCompatible(id, modes){
            //TIENE PREFERENCIA EL ARRAY 'pinModes'
            var pin = _JSduino_.utils.getPinUsed(id);
            //pin = pin ? (modes.indexOf(pin.mode) ? pin : null) : null;
            //si se encuentra ya asignado a otro actuador, lo utiliza
            pin = _JSduino_.utils.getPinCompatibleWithActuatorsModes(pin);
            //Si ya existe el pin definido por 'pinMode', lo utiliza
            pin = _JSduino_.utils.getPinCompatibleWithPinModes(pin, modes);
            return pin;
        }
        function getPinCompatibleWithPinModes(pin, modes){
            if(!pin) { return null; }
            var pinCompatible = pin;
            var pinModesArr = _JSduino_.getPinModeArray();
            for(var i=0; i<pinModesArr.length; i++){
                var pMode = pinModesArr[i];
                if(pin.id == pMode.id){
                    if(modes.indexOf(pMode.mode) > -1){
                        pinCompatible = pMode.el;
                        break;
                    }
                }
            }
            return pinCompatible;
        }
        function getPinCompatibleWithActuatorsModes(pin){
            if(!pin) { return null; }
            var pinCompatible = pin;
            var pinActuators = _JSduino_.getActuators();
            for(var i=0; i<pinActuators.length; i++){
                var pAct = pinActuators[i].act;
                if(pin.id == pAct.pin.id){
                    if(pAct.type.modes.indexOf(pin.mode) > -1){
                        pinCompatible = pAct.pin;
                        break;
                    }
                }
            }
            return pinCompatible;
        }
        
        function cleanPines(){
            var indexes = [];
            for(var i=0; i<pines.length; i++){ if(!pines[i].pin){ indexes.push(i); } } //detecta los null
            for(var i=0; i<indexes.length; i++){ pines.splice(indexes[i], 1); } //los suprime
        }
        /** Comprueba si el 'id' del SVGElement creado por el 'pin' tiene un 'actuador' asociado*/
        function hasActuator(id){
            cleanActuators();
            for(var i=0; i<actuators.length; i++){
                if(id == actuators[i].id){
                    return i;
                }
            }
            return false;
        }
        function cleanActuators(){
            var indexes = [];
            for(var i=0; i<actuators.length; i++){ if(!actuators[i].act){ indexes.push(i); } } //detecta los null
            for(var i=0; i<indexes.length; i++){ actuators.splice(indexes[i], 1); } //los suprime
        }
        /** Construye un objeto de actuadores como un objeto de guardado especial compatible con el tipo 'objectActuators' que 
          * debe tener una estructura muy definida tal que así: 
        objectActuators = 
        {
          INPUT:{ //UL ACTUADORES (INPUT, OUTPUT, LEVEL)
                    id:        "buttonsInput",
                    caption:   "ENTRADAS:<br />",
                    className: "actuators input",
                    list: [   //lis
                            { //li actuator
                                type:      "switcher", //switcher, pulse, button, buttonNO, buttonNC, sensor, led, ledWhite, ledRed, ...
                                family:    "DIGITAL",  //DIGITAL, ANALOG, POWER, AVR, SERIAL, SPI, I2C, PWM, INTERRUPT
                                id:        "8",        //"hole_8",
                                txt:       "AC-DC",
                                value:     1,
                                className: "actuator"
                            },
                            {...}
                          ]
                },
           OUTPUT: ...
        }
        */
        function makeObjectActuators(actuators){
            var inputs = { //Actuadores
                id:        "buttonsInput",
                caption:   "ENTRADAS:<br />",
                className: "actuators input",
                list:       []
            };
            var outputs = { //Receptores
                id:        "buttonsOutput",
                caption:   "SALIDAS:<br />",
                className: "switches output",
                list:       []
            };
            var objActuators = {INPUT: inputs, OUTPUT: outputs};
            for(var i=0; i<actuators.length; i++){
                var act = actuators[i].act.toSaveObj();
                var mod = objActuators[act.mode];
                mod.list.push(act);
            }
            return objActuators;
        }
        
        //NOTIFICACIONES PARA PINES DE SALIDA
        function update(upd){
            cleanActuators();
            for(var i=0; i<actuators.length; i++){
                actuators[i].act.notify(upd.value);
            }
            return false;
        }
        //var updater = document.getElementById("updater");
        //updater.addEventListener("change", function (){ update(this); });
        
        //COOKIES: FROM: 
        /** Intenta guardar la información en cookies, si no se pudiese se guardará en 'localStorage' */
        function setCookieStorage(cname, cvalue, exdays, path) {
            //if(!cvalue){ return false; }
            cname = cname || "JSduino_save";
            exdays = exdays || 90;
            path = path || "/";
            try{
                var d = new Date();
                d.setTime(d.getTime() + (exdays*24*60*60*1000));
                var expires = "expires="+ d.toUTCString();
                var cookieContent = (cname + "=" + utf82b64(cvalue) + ";" + expires + ";path=" + path); //max-age=<segundos>; domain=<dominio>; secure; httponly;
                document.cookie = cookieContent;
                //console.log(cname +"\n::\n" + cookieContent +"\n::\n" + document.cookie);
                if(!document.cookie){ throw new Error("este navegador parece no admitir cookies"); }
            } catch(e) {
                //console.log("JSduino.utils.setCookie():: WARNING:: Algún problema al guardar los datos. Puede que las 'cookies' estén desactivadas: " + e);
                console.log("...sin cookies... intentando guardar en almacenamiento local (localStorage)...");
                return setLocalStorage(cname, cvalue);
            }
            return true;
        }
        /** Intenta obtener la información de cookies, si no se pudiese se intentará de 'localStorage' */
        function getCookieStorage(cname) {
            //if(!hasCookie){ return false; }
            var name = (cname || "JSduino_save") + "=";
            try{
                var decodedCookie = b642utf8(document.cookie); //decodeURIComponent(document.cookie);
                var ca = decodedCookie.split(';');
                for(var i = 0; i <ca.length; i++) {
                    var c = ca[i];
                    while (c.charAt(0) == ' ') {
                        c = c.substring(1);
                    }
                    if (c.indexOf(name) == 0) {
                        return c.substring(name.length, c.length);
                    }
                }
                if(!decodedCookie){ throw new Error("quizás este navegador no admita cookies"); }
            } catch(e) {
                //console.log("WARNING:: Algún problema al obtener los datos. Puede que las 'cookies' estén desactivadas: " + e);
                console.log("...sin cookies ... intentando acceder al contenido a través del almacenamiento local (localStorage)...");
                return getLocalStorage(cname);
            }
            return null;
        }
        /** Comprueba si hay cookies, si no se pudiese se comprobará 'localStorage' */
        function hasCookieStorage(cname) {
            var name = getCookieStorage(cname || "JSduino_save");
            //alert((name === false) + ":" + (name===""));
            if ((name !== null) && (name !== false)) {
                //console.log("COOKIE:: JSduino.save->" + name);
                return true;
            } else {
                //console.log("WARNING:: Algún problema al preguntar por los datos. Puede que las 'cookies' estén desactivadas.");
                console.log("...sin cookies ... intentando preguntar a través del almacenamiento local (localStorage)...");
                name = getLocalStorage(cname);
                return (name !== null) && (name !== "");
            }
            return false;
        }
        /** Intenta borrar la información de las cookies, si no se pudiese se borrará de 'localStorage' */
        function removeCookieStorage(cname, path) {
            //if(!cvalue){ return false; }
            cname = cname || "JSduino_save";
            var maxAge = "max-age=0";
            path = path || "/";
            try{
                var d = new Date();
                d.setTime(d.getTime() - (1*24*60*60*1000)); //el día anterior
                var expires = "expires="+ d.toUTCString();
                var cookieContent = (cname + "=;" + expires + ";" + maxAge + ";path=" + path); //max-age=<segundos>; domain=<dominio>; secure; httponly;
                document.cookie = cookieContent;
                //console.log(cname +"\n::\n" + cookieContent +"\n::\n" + document.cookie);
                if(!document.cookie){ throw new Error("este navegador parece no admitir cookies"); }
            } catch(e) {
                //console.log("JSduino.utils.setCookie():: WARNING:: Algún problema al guardar los datos. Puede que las 'cookies' estén desactivadas: " + e);
                console.log("...sin cookies... intentando borrar desde el almacenamiento local (localStorage)...");
                return removeLocalStorage(cname);
            }
            return true;
        }
        
        //LOCAL-STORAGE:
        /** Guardará la información en 'localStorage' */
        function setLocalStorage(sname, svalue){
            //localStorage.setItem("lastname", "Smith"); //localStorage.getItem("lastname"); //localStorage.removeItem("lastname");
            //if(!svalue){ return false; }
            sname = sname || "JSduino_save";
            if (typeof(Storage) !== "undefined") {
                try{
                    // Code for localStorage/sessionStorage.
                    window.localStorage.setItem(sname, utf82b64(svalue));
                }catch(e){
                    console.log("JSduino.utils->setLocalStorage():: Error en 'localStorage', probando con 'Storage.toString()' .. " + e);
                    svalue = window.Storage.toString(sname, utf82b64(svalue));
                }
            } else {
                console.log("STORAGE:: Sorry! No Web Storage support..");
                return false;
            }
            return true;
        }
        /** Obtendrá la información de 'localStorage'. PROBLEMAS CON PROTOCOLO 'file://' */
        function getLocalStorage(sname){
            //localStorage.setItem("lastname", "Smith"); //localStorage.getItem("lastname"); //localStorage.removeItem("lastname");
            //if(!svalue){ return false; }
            sname = sname || "JSduino_save";
            var svalue = "";
            if (typeof(Storage) !== "undefined") {
                try{
                    // Code for localStorage/sessionStorage.
                    svalue = b642utf8(window.localStorage.getItem(sname));
                }catch(e){
                    console.log("JSduino.utils->getLocalStorage():: Error en 'localStorage', probando con 'Storage.valueOf()' .. " + e);
                    /*
                    //PROVOCA UNA REDIRECCIÓN:::
                    var l, p;
                    !localStorage && (l = location, p = l.pathname.replace(/(^..)(:)/, "$1$$"), (l.href = l.protocol + "//127.0.0.1" + p));*/
                    svalue = b642utf8(window.Storage.valueOf(sname));
                }
            } else {
                console.log("STORAGE:: Sorry! No Web Storage support..");
                return null;
            }
            return svalue;
        }
        /** Intenta borrar la variable pasada del 'localStorage' */
        function removeLocalStorage(sname){
            //localStorage.setItem("lastname", "Smith"); //localStorage.getItem("lastname"); //localStorage.removeItem("lastname");
            //if(!svalue){ return false; }
            sname = sname || "JSduino_save";
            var svalue = "";
            if (typeof(Storage) !== "undefined") {
                try{
                    // Code for localStorage/sessionStorage.
                    svalue = window.localStorage.removeItem(sname);
                }catch(e){
                    console.log("JSduino.utils->removeLocalStorage():: Error en 'localStorage', probando con 'Storage.toString()' .. " + e);
                    svalue = window.Storage.toString(sname, null);
                }
            } else {
                console.log("STORAGE:: Sorry! No Web Storage support..");
                return null;
            }
            return svalue;
        }
        
        //BASE64: Codifica/decodifica la cadena a base64 escapando primero la cadena.
        /** BASE64: Codifica la cadena a base64 escapandola primero. 
          * ATENCIÓN: Por problemas cross-browser con 'btoa' y 'atob' (aunque generalizadas, en realidad son soluciones Mozilla) 
          * se ha optado por BASE64. */
        function utf82b64( str ) {
            str = str || "";
            var resultado;
            try{
                resultado = window.btoa(unescape(encodeURIComponent( str )));
            }catch(e){  //IE
                console.log("JSduino.utils->b642utf8() :: Error en 'btoa'... probando con 'Base64.encode' ..." + e);
                resultado = Base64.encode(unescape(encodeURIComponent( str )));
            }
            return resultado;
        }
        /** BASE64: Decodifica y escapa la cadena en base64. 
          * ATENCIÓN: Por problemas cross-browser con 'btoa' y 'atob' (aunque generalizadas, en realidad son soluciones Mozilla) 
          * se ha optado por BASE64.*/
        function b642utf8( strB64 ) {
            strB64 = strB64 || "";
            var resultado;
            try{
                resultado = decodeURIComponent(escape(window.atob( strB64 )));
            }catch(e){  //IE
                console.log("JSduino.utils->b642utf8() :: Error en 'atob'... probando con 'Base64.decode' ..." + e);
                resultado = decodeURIComponent(escape(Base64.decode( strB64 )));
            }
            return resultado;
        }
        
        //PUBLIC API:
        return {
            loadStyle: loadStyle,
            loadScript: loadScript,
            createScript: createScript,
            Base64: Base64,
            getRandomInt: getRandomInt,
            getMaxOfArray: getMaxOfArray,
            getIndexFromNearest: getIndexFromNearest,
            intersection: arrIntersection,
            diferenciation: arrDiferenciation,
            unique: unique,
            indexOfArray: indexOfArray,
            getKeys: objGetKeys,
            
            availableVarName: availableVarName,
            getLedById: getLedById,
            getActionById: getActionById,
            getLedderById: getLedderById,
            getDeviceById: getDeviceById,
            getDeviceByData: getDeviceByData,
            hasActuator: hasActuator,
            cleanActuators: cleanActuators,
            makeObjectActuators: makeObjectActuators,
            cleanPines: cleanPines,
            getIndexActuatorById: getIndexActuatorById,
            getIndexPinById: getIndexPinById,
            getActuatorById: getActuatorById,
            getPinById: getPinById,
            getPinUsed: getPinUsed,
            getPinCompatible: getPinCompatible,
            getPinCompatibleWithPinModes: getPinCompatibleWithPinModes,
            getPinCompatibleWithActuatorsModes: getPinCompatibleWithActuatorsModes,
            update: update,
            setCookieStorage: setCookieStorage,
            getCookieStorage: getCookieStorage,
            hasCookieStorage: hasCookieStorage,
            removeCookieStorage: removeCookieStorage,
            utf82b64: utf82b64,
            b642utf8: b642utf8
        };
    })();
    //END MODULE: JSduino.utils
    
    //BEGIN MODULE: JSduino.objects
    /* Sub-Namespace 'objects' dentro del namespace 'JSduino'. */
    _JSduino_.objects = (function (){
        var musics = (function _musics(){
            return {
            };
        })();
        var sounds = (function _sounds(){
            return {
                beep: new Audio("data:audio/mp3;base64,SUQzAwAAAAAAGlRQRTEAAAAQAAAAYnkgR3VlcnJhVHJvbjE3/+MYxAALAfLqUUEQApJABbGEAxjGMY/AAAF8Y3///+AC//P/t+n/k////5znAwMWfB8P/BAEAffokIJ+v//Vo1f//10kloo//+MYxA8O8jbkKYCAAPqUtSlqSWpSRkYhqIKSjVG/qDhjoZvSRSJoPZDfRzTZgWd//KmjJg0lz///oQANv9rhH///8hb8hSF4/+MYxA4Muga2UcEQAIUhPiFQ3oahn80xn/Qz/oY3/6l0MbLQzysgEBMYCPRE7Ue//ERMQU1FMy45OS4zqqqqqqqqqqqqqqqq"),
                clickOn: new Audio("data:audio/mp3;base64,SUQzAwAAAAAAGlRQRTEAAAAQAAAAYnkgR3VlcnJhVHJvbjE4/+MYZAADAAFLEKAIAQOAAmgBQQAAgAAOWCH///5QH3/4IO1AgCEEP8EP/8QOf///////gh//5cEHLB////9/6G/4ud2Vw4HG/+MYZA0EXQl0AMAUAASgAsgBgBAAEilQpUKHQF/8+/sHw+cSFnymDweWJf//////DGKnUCY9/y58WlQEeWrDj/ABoLB3w19R/+MYZAoC4AEdJOAIAQRYAgQBwAAA7gr1f//nUZX///rOkv////////yp2s6s7BosHdnEtUxBTUUzLjk5LjNVVVVVVVVVVVVV"),
                clickOff: new Audio("data:audio/mp3;base64,SUQzAwAAAAAAGlRQRTEAAAAQAAAAYnkgR3VlcnJhVHJvbjE4/+MYZAADTAMoaKAIAAAAAkgBQAAAGIQAnB94gB8/8ENgIRIGP5T0ygYKHP3f/8Tq/8xf5oIv8zT//MpCof/8/MpApBQZf/8i/+MYZBgFVQ1yAMCIAIPINtmBgigAudJBIYO4CGBDif/2/+FIHfjZKeeEYAB/dcNqckFWdYFZphZbJIxgHKgtwaGB3griXlj3/+MYZBEDGAFxKOAAAQNYBoQhwAAAEvLHv5b/+Inf/iX/Lf4liX/yob4NVQAgMkAH//FRX//1//7P/9YqKsMLFfxWkeKirDAV/+MYZB0CoACgzAQjAQNQAQgAAAAAFRVLxUVVTEFNRTMuOTkuM1VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV"),
                light3: new Audio("data:audio/mp3;base64,SUQzAwAAAAAAG1RQRTEAAAARAAAAYnkgR3VlcnJhVHJvbi0xOP/jGMQAC+jyvYlBGAID5Bof//8xjH44x/mN8YxjGNwAbwIAIsHAQcD4fxOfrB8H4Pg+D8uH+D7//ygIYIIADAAjA/AD///8jf/jGMQLD3JS1ZGBaAEL/0pwq9X58CECxPGKKlsE6AYD/wNYyfzJFkkVJVJf//+6kqSS0jM0q/0Wp/+SJqZIwsr///////6SR//jGMQIDzqqbAHSsABFagI8DLwJqBgCBeBheD+BoCD0BhBA8Fyw+USiThFi6gl///////rJkPxHcl////////9Ir///5fkJgf/jGMQGDSKqUAAHWsQhYRAclaFgLHSQPK2HMHQiRBblAM1X7zv//////+zg6QLbf////////WO67//5BQCIE////V//t1eomP/jGMQMDkqqXYFQqAI0BtEQwNVgGAABJJA3pAhSAGCgELYSA56Sze1v//////zAhgw0/////////yqq/////4PyUL/pDaNEJf/jGMQNDvHuhAGBoADCoTQEiYOikn8B8MCQEy+BhEIEh5XNEzc0b///c0QoIMgg05/8z/OHy8P///ROIg0B//////6mmmmnHP/jGMQMDGkGiDHHSAH1NGoPQWhYEg0TNSlJZVCCgv9BQUF/+goKb/4goUd/gwUFHf+QVUxBTUUzLjk5LjNVVVVVVVVVVVVVVf/jGMQVAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ=="),
                piedra2: new Audio("data:audio/mp3;base64,SUQzAwAAAAAAGlRQRTEAAAAQAAAAYnkgR3VlcnJhVHJvbjE4/+MYxAAMISpkoUEwABP///j4FzGNr/+Mfe+7Jk9gBhaexEZZAgGPX+UBAEAxBB3if/58QAg4SBjhj//6wfX//9yffQMH5v6o/+MYxAoPuf7cAYI4AEGHzlZ0m7nu1huTAZHhHJFVGpn7X/Y01CRAmeZ/e3/9j2VJECCh3Z/5kWvCyNsqj/1MErxCZ1W35BxQ/+MYxAYNmUKwAYIoAJ/zGsl39qR4p6/wAA5A6LCbiIkHjbf+IMeBkJH1VfwYB4TJcW6/8QiVIvYe//458tVfSXzznBAAzzJn/+MYxAoO0eqoAYJAAMVBKX+iVjSixHFDdVWm0z/uhFAOAIAMWQC5WJFYtZrn/7+Dkdcij0///////yHZsURVMDvOftVdqqua/+MYxAkOcTYcEcZAAAoTppFH1rzvz/vM+SM41VWVVb5mdVhmJBqC04kVNqNVkkVNoGgaLB3Dn/5X3f//8GlMQU1FMy45OS4z"),
                turn: new Audio("data:audio/mp3;base64,SUQzAwAAAAAAG1RQRTEAAAARAAAAYnkgR3VlcnJhVHJvbi0xOP/jGMQAC6GawGlBKADwgE//////8Yx/xjG/nP//6nO5Oc5zvziYfD7iABgcXAgIO///9L+D4f//8Mfh9cBdhtdmAANDVM//Uf/jGMQMDnHW6HmAOABo8OkR4dEmj/3/U1FNFQqF7fnDx4S99mQSjjTY8ePElBoC/V+HVHg7PHv//CRJ+//8wwxXcxTU1/9SUf/jGMQND6MS0AGAUAD5APhEKAUBoNOmmoKwLSD7/zjX1c9GZ0+v//7seqMYruysf////89zC48UsRp7XNChVf/n/7/9//72dP/jGMQJDtuG0AGBKAEn//uQUFyCg8Q/5f+goPAQCA4gKRAU////QhHyEZCf////RpGkIxBRkJ/////+xBRhwArD/5/+H/9Gtv/jGMQIDosSxAGBaAD//MaKNaP//1l0kViegQUJsE6b/Ul/62fSqS0kv///0kqSSjIklqMqv////MqjJeoyL1X/kJzCpf+FSP/jGMQIDYmFgAHBGABPITmFRf+quzH1mbVS2L//6q7M3WAmNQFSwKnQaHhvxEeBU6IQVLB0qe9l0SuLKkxBTUUzLjk5LjOqqg=="),
                pop1: new Audio("data:audio/mp3;base64,SUQzAwAAAAAAGlRQRTEAAAAQAAAAYnkgR3VlcnJhVHJvbjE4/+MYZAADEAF3AKAMAAPgAfgBQAAA0baxghlChzlAQBMP5QHz+XB8/+XB+IHCD//////rBwEHfgmD5/8oGMKb/cKGAv84YCFf/+MYZAsEbItsAME0AAPQBjABgBAA6iSJZi8Pb/+ThxHAmwCXEzR7JDFJLWISv//////1X/s+m5Gp3WlAqv////+YQ/kISiEI/+MYZAsDZJc4AOCMAIAAAjQBwAAAQhCLZj1VW1CgICAiVYCAhtUoSN0Eg0Am6vVxbrFOr/W3Wzq/1t/rFv/VQBaz/8U6lUxB/+MYZCIDHALLLAQjAAGYAcngCAACTUUzLjk5LjNVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV"),
                inbox2: new Audio("data:audio/mp3;base64,SUQzAwAAAAAAGFRQRTEAAAAOAAAAYnkgR3VlcnJhVHJvbv/jGMQADQjieAlQEAAX//6afUgh/QJgcwUGILiUx3jGBiALIA2wfwsICwwNUDgRMy+moDAwfggZ/////////ycPqv/+b/Uzgv/jGMQGDakyqAGCoADp2ICDQ0AwREKmpxghNAWHmRsyIJiApWIwkxmFJVe90/D2BNC8cPs7/1////8n+n9NBDkgg//////+L//jGMQKDynK1HnKmAIBImONN++ozb/31K9AzOD7FZD/A0SB5OHQDdJQpmSS1f/qQWgdJ8mC0RcGLBOUT////IoUgTbD40icJv/jGMQIDmKuzHgDUr2DOi2jeo9b///9QjL///62WaqJYCVidK0q0VJUUEb////ZNPoIFwuF8vl95MBBlu8dekFF21k0ICL2G//jGMQJDmqurDABoKRf0zsbCZKb///uzkOAXDT///2UpQ2BM2e//////9dFa9FEul0umhHBdiI7/+ov8VC9UQAsF//////6KP/jGMQKDwtm0HlHOAJYFp48eYTeo+XH0Kgw1v///0Cv////FRfZGPZW/r0p///9WnzhwRUDP////85zf+jjpypyYN1S1pELdf/jGMQIDhLaqAGAaACiR63JIs/Fmj+MUt+qZhmT/jSVL/k0UUP1D2Q/8kT3/nf//WTAt5cf/0wqT//RGBRqLP/7/zhB/misC//jGMQKD3pqjAGBUABGisI//4LwFYbERxC5D//4wANAEiFISUoacf///kQ+OVuv////XnKcRCKOCoV//xowsJhJTEFNRTMuOf/jGMQHAAADSAHAAAA5LjNVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ=="),
                censurado: new Audio("data:audio/mp3;base64,SUQzAwAAAAAAG1RQRTEAAAARAAAAYnkgR3VlcnJhVHJvbi0xOP/jGMQADElKXAFBwAH//////yAD/kDPPusKSkhhyF3tfplbCzhiIZBJII3mxxsMW8ex93Ld+N09IAdDw8AEKgQgkQIP9MYgyP/jGMQJDclOoYGNoAIHZ/kibm5n/kuUFIa7t/U3UpNEMRBY6Ac4HD0VBJYC1U98IrgYqi3EyxpOrT8MVYBRtqFeBrVZqTDKe//jGMQMD6FemDHToAClRSfIa6JgjonPSNlLRSMj3//9WtjIhw7wEBAGWoWxJFBKjQSYj6RuN//////umQkMbuWQCI/KQZ+NM//jGMQIDTEmoFCBqGQ0ehTT65wpCwgtMoABGf9rFNfzMc8r/6//CIYGQFdwKrV8uf/wffV/9Yf//knHv+2tDyEkzv8rH4rng//jGMQOEGrWoChdCqyJHwHpFNWkkuJt/+35ZHknjpz82e38IhgZAqdT6a3//nDA9//40KFn9////QBZv///1gUyPq+OSUfuEf/jGMQHDUrW0ZlHaAIDV9jv5xQ9CSOcKS//b+Y836//MBiBkQb/X7/9R1X//1oP9f///qSdH///91GzVeCE5BeN5BqLVz3u1//jGMQMDZGOuAGIiACsDcjG2frjv/b1NUh8IwGLqIhCMBivKZGpBBgpC5///moIOIPb/py7wuUVEtu1QckA6gZBUFQVDUFQVP/jGMQQDBAC6lnAEAIVBYOg0HYiPViYGgaBo98tLA0d4LB3/EQNeoOs4i//+tVMQU1FMy45OS4zVVVVVVVVVVVVVVVVVVVVVf/jGMQaAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ=="),
                crack: new Audio("data:audio/mp3;base64,SUQzAwAAAAAAG1RQRTEAAAARAAAAYnkgR3VlcnJhVHJvbi0xOP/jGMQAC9FWgPlBOAIYkARB/kNkAAAK//KAGMAAfmP//zP+g4NAeA8B4WEcBgDBIIO//4fKAg7/////BBX8D+QjMGBnZwMwG//jGMQLDbmW1MGCUAC0FSA2b/////oZneT/qSOehKb/hfJ/hqRnuD5//8o4EAAGCn//Ien///WQKCKoGcWACFGDmAD6Nu0lsv/jGMQPDrHC7AHCEAC999HakzJal2OXp3z9F231/TrbdVN6sZyqiAxUWbNWx+WcKlG7v/R9n9w7pgr9VJQGJAQFCFZoO9y1nf/jGMQPDUA67YgQRgCcYIgNQGnHuBYrYwqZIqVWL1tTOzFbVb1/UKW+UdtRWj6f//FFDJLZbRI3IynRzzKypSIOWOtWsBhlwv/jGMQVEDhTKlgIRgK6liFl39xkOFQqtXx4VFWfDyDSbu7wiDJcWTHFBZN45tVaEIMhsz7A4TJq17bbbG01F4oRYH1QdS13yf/jGMQPDLnfGlFDEALx1TaVHvkhlLAc//s8vZF9W6af/T9P//96Mw7nHOyfNEJT/9wcCttxfvkim3cw/////6+n/z+9hJNDGv/jGMQXEloS1MmBKAD/RE3q3RBZRpRFDKwYhzuquyDjjyEgZBW0sBWixE6KhIOmC7Q49bmnosqbWeBb52Tf/TVCIQ/qqFAQFv/jGMQIDEj+lFHDGAA+qqqrf1VVf/+Mv+qr+zMzMyr6qoUBDsSgqdlgaPf/+o9Br4lBU94iDqpMQU1FMy45OS4zqqqqqqqqqv/jGMQRAAADSAAAAACqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqg=="),
                alert2: new Audio("data:audio/mp3;base64,SUQzAwAAAAAAGFRQRTEAAAAOAAAAYnkgR3VlcnJhVHJvbv/jGGQAAyADARygCAACsAIASUAQABeNQNAoHg+bhj8EP//8uf/l3/KHLoIX/+gDIf/////hj//4nf///v/DN/8vnCc0i6CCAv/jGGQPBJyfaADAyAAFWTbMAYBQAIP+TjTRN03Jkqni6VS8alf//b//pD3/2oxGBgNP9tvFUdIys4bHf+n//+UVCFD///9T///jGGQHAvibcmTmlAAFoM8qWcIQAv/9KDqDUJyipkf3//KFG/+oADAEQbAD///8pW///8GP/8sz/7Hf+hUAwB8Am///+JONqv/jGGQLA3jjfsgAQjiFsOLgAABQaAh///Vv2yUWioqf/RldjAA8////ES4AoQBbouwQ1fa63lNhDczAYgUCSAGA///+tP/10//jGGQLA4zjcMgoB4IEKcrcAABOwPoaYQMgSBXJ/6//54jAtOfyOU0TSFYRnon////v///6IXQD/gAQbCpohhMAYIMk1///of/jGGQRAviZgSAAKhIDONL5gABEQmfqh3//nFgKIA+hxn/+3/w4udCSAGsBEmTsgQHkGhpRz/J//Ue/QAPQwKOqICqnt//U///jGGQfAlQ3kSAAbCEEuTL+QAHERIdH///3eKoT/+azkVG3CMZR6mnf////6lm+mn//YU4nVwGBlAILf7D31Fv/McpHE8v3MP/jGGQsAki5dgAAJzQE6M7kAACWTCUBj/f6J1v+H/3N/4NPP//8zk56eDotrOvNYX3//5cz/1A2A8AuooRCLLf//8uTFvQ7/v/jGGQ5AoBzbAAALFAFOOrgAABYaP/Up/V/U3pHhs9AMBjLt//1/5Zf//+HABX7HE+ntXzh3kb8oBbDCgQ/7vl//Sgb6AIKP//jGERDAoSbbsAAJyAFMcbUAAHEqf//4TA4zMH6jlv///1gqv6ikLZwXRrsAC7f////oM7///Vh+7oBocL02/5iuz7sPoEh2P/jGERNAqBnagAASSYE6O7coAFMUHKLtdv9JCqEX/1jCIPoWcQCJnLWb//7//1FTf+PAz/+8hIOHfKBRNs7G//+T/+Mf/66+v/jGERXAojjaAAA4lIFgObEAAKWTJIZ//+YxjVBeIwlGUKP3f/+K///Frf/94V5PT4KoWudgIG//+Vf/10E/p+XooYuK49MQ//jGGRfAsC5agAAJTQFIWrUAABKaFsesOX//pI/+BwpEv//kL2R7jAz//rq3/0N///xouMVAFoqYkAA+gy/yZdFboq3//qAH//jGERnAsCbYAAA4igEqNLQAACeaPh36EJ///8IgTcLBa////wK70G4can/XNtDYo3hFQHXTeX0KJYGgLX4KfrDX/CZD6lHf//jGERxAphvYgAASTQFYcbMwABKbf/2VXwogYBBJn+q6w5xPovOx+0WqWT9CeHy1jaP6X/OTD/E5n/wn/HIGiKbX8/E9pyeQP/jGER5Apg1gywAIyEDyOrMAACMUNdxRRgYBQzwjU7p/0yN/+HF1fqEf3+tKlKFRKbAmCBFZIkG3//6//9Dmb//6KSYxZX/9f/jGGSIA9B1WAABTyYDkNLEAAAEBNIvEFJ9Goeg0AnMyHZE//ml//UJgz/+lf///zG//7bikhQSAhJ3YKxbqf/1BH/kSv/////jGESOA3RzVgAATCYHYWq4AAIEUat//9RGdZUWhcWrg4Bu/NacVOJb/eZGqgJIwhyKX9MkqG8NaxqG8+bkaQgTkKtaiaJk8f/jGESHA5jlVgAApyYG8W64AAQKbDX6JfUySZYNzIvF5FFFT//c13/U///PPb04D///8T0/oKksLg8uYl0cP4CrLqaCNA1WXf/jGESBAwR1WACjmAAGgOa4AUcYAEEUUVP/orRRNUS6msx6Sn0kv/HuAVjlTLqrjtGFJVI6EdlVTEFNRTMuOTkuM1VVVVVVVf/jGESBBozfTnDCzAAO8fKUCYJoAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/jGGRDAAABpADgAAAAAANIAcAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ=="),
                alert3: new Audio("data:audio/mp3;base64,SUQzAwAAAAAAGlRQRTEAAAAQAAAAYnkgR3VlcnJhVHJvbjE4/+MYZAADPAFiyKAAAQNIApQBQAAADSLpgPxP5SUid/0efUCEp4f/w/KSjv5R3DH//l4P/iBwIfl4P/4Y69ffKdGypE1IemNu/+MYZAwDuNVwAMOIAAYxqtwBghAA/J8/2/p/f+v9S/6t/g31iP5H//r18XycT+pm8T8V/Rvz/1/xf+HT/B/+hQ88///Vv6x0/+MYZAgDrMtuwOOIAAThltQBwigAQ1bV/Mb/1Jnn53///Gf//7+gE//yP///0CDN///2E////p///9Qb/9L/9//QeGmb9QGE/+MYRAoC+MleABQHQgV4zsQAAo4o1///9///82cXFwC/9jzf+qiFA8c2///1AQLob/5H/5QN//Cd7sgOH5ZborpZf/B0CY0V/+MYZA8ECMlcAAFHIgXZjsQAAcpQ+tv/543dv//89wyIyjfrxAa+oXHznRv//njQgRe3//9T///+oTBn/1L/8V/+cXOf///G/+MYRAoC+MteABQKkAXBkrQAAw5gAYWZv//9RL+eHDn/+JwmMbT////sDkXlnb///b///0PBA5/4lv/3f/lVHRdP//UKOV///+MYRA4CzMdeAAgHkASZLrgAOAqE/+VvsF3Gf/Lf/t/5UIym5nwkHjp///nH//UuCu53///oBhJ////f///3Hw23/6/+oZkj/+MYRBgCNMtaAABHMASplrQAUASE7eoC3///xH///w4d6v/zP/gQJDzdn//6ES72///qS/yMC7/UAgQxf//9VBl/9f/7CVUM/+MYZCYCtMtaABwIkAOg0rgAAAoEihBn///mMacf0//9Tf///iAIme//ib6lBUN///eCP///8v///0Gd+oTzCJdf//mCLJ///+MYZDQC6MtUAAFnMAQhlrQAAURE/0///+wDAmX/7f9SonLMY///9hAn///qZ/oBUvqA0bsQf//+eD4dp///z////6LDv/5v/+MYRD8CfMlWAAFFIoUBkqgAOAcg/nBCSpf1BHO3///T///4Mf/9Nf/q3/oAwPK3//1qJCjN///qO/hYqgRkbP//8gGQb////+MYZEoCjMlSAADpLgVBlqgAOASE1J///5nA6v/3/9QqW3//9BCT///zf//+g0Gu/8kEiH/6/+oDHl///zhNb///////+DPV/+MYZFMCpMtQABQFkARRkqAAAMpgzAUAkQAG3rRr9ubYqBaIsvCmFowwXLpwkHawHzLsTCYIdv3f7TT59nT6iSCZv8hG26DX/+MYZF8CxMtQAKKUAAVBlqjJRSgAtldPTIgKC9XV1Hsmd3qJowpdeC8SDuZJoM7rKgtZA6ZdX6j7e5X/W9/Z/WgZjJ/x/d6F/+MYRGYG9MFGuMUoAA4BqozBjWgACgiH0pBjR9PxIv//9+Urf//qVkMKMt9YKhuJf/DsFQ2s7Lf///4iljwlDYlDVUxBTUUz/+MYRCkCKGkyAOEMAASIAmwBwBAALjk5LjNVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV"),
                pase: new Audio("data:audio/mp3;base64,SUQzAwAAAAAAGFRQRTEAAAAOAAAAYnkgR3VlcnJhVHJvbv/jGGQAA4SVPACgjAAAAAIMAUAAAMxv///x4Af5AAoAA+NELd3NAMDc/d3EI7EgIAgqVP/s5H18nGgE4hx6MhsvllybzMO5af/jGGQWBdylVADFLAACMAY0AYAQAK//lZKAkGodFD2XSdSKSaayj//5YeLPjS3//////7f/p1VMQU1FMy45OS4zVVVVVVVVVf/jGGQRAAABpADgAAAAAANIAcAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ=="),
                pase2: new Audio("data:audio/mp3;base64,SUQzAwAAAAAAGFRQRTEAAAAOAAAAYnkgR3VlcnJhVHJvbv/jGGQAAzABUFCgAAAAAAIYAUAAANInB9/6wfLg4GBOD4PjAQwTD/71v4IAgCDl/5H/kHPU5tf/8zyVma260pPTOLJMD1w5ff/jGGQZBsDXfgDAoAACgAY4AYAQALlVkOev//Fw0IBgoZn3AiriCwqQTR38ml1FxFQF//////+7/6vdkRcNtRHAAOSo28GlHv/jGGQMA1QDfSzgCAEAAAHgAcAAAMKyzwV5Y9/+DXW7UDSg6kxBTUUzLjk5LjOqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqg==")
            };
        })();
        
        sounds.wakeUp = sounds.light3;
        sounds.silent = sounds.mute = sounds.pop1;
        sounds.remove = sounds.piedra2;
        sounds.create = sounds.inbox2; //sounds.pop1; //sounds.light3;
        sounds.error1 = sounds.turn;
        sounds.hide = sounds.clickOff;
        sounds.show = sounds.clickOn;
        
        var images = (function _images(){
            return {
                logo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD8AAAA/CAYAAABXXxDfAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAALEQAACxEBf2RfkQAAAAd0SU1FB+IBBgw3K7ryxlUAAA7BSURBVGhD7VsJcFTlHf9IIBA55DDIVS5BQRQ04RQhIEROAYVQIogVW6ytY6VV27Gd2WmnjnUoR8ie2d339kr2TDbJ5k7IJkSBig7OWOwxHXXUWsej9WiVQs3X3/97+172haAJ1k2Y8s282c3b7733/f6///29MJaqwfkAzviA/Pz8dMb5QM7YAANnaQbO00KcpXP2+wzGQ+mcs4GpWlLKnsNDjECnMQ6QNCAM7eE8VwHMDRAAv/zB81w20MANAAvAGLeU1waWRGJnF4RjHTnhKn5LqJLfFKjgs/1Rfn1JGZ/ujfDJntAXk1yBs0Ofb7XSNfkhns5fZINYPj6hNSlj6ms/yKCAvr2+medW1vHbo7V8SVk1XxCJ8ewQwAdV8OUKeF+ET/GG+CR3iI93BXiW7P9Plr2kme6Ryw0wk34MHraqMAO26GNtrDFyZ1VDxx0AvqKiVgFfXiPAE/PzghVgPgrmy/lMgL9OgA/zSR6AlwN8rOzno52l/GqH7/zgaKV/L2dX5bL+6g/AdCh0o7DnDTXNfF11Iwd4fkdlPc8V4Gs05nPClQCfYL4UzJcS+DCfAuAq82MlPx8jEfgSPtzu44MdvnZFG/uhBkAtB9HStjTGuQY+1sBXaeA71V5hnsBH+SwwT+CnE3hi3h3k46D2BH40wI8E+GEAn1ns5YOsrtcSzpJ8gNCwfjO2NrbyzbVH+cbaBPMAf0cVmI+SzSvML0zYfLLa62ye1N4V5FlSAMyXCOYFeJuXZ9g8PM3keoUhNLLCwsF9DpwzgwhN2xta376nvkWAv6umSVF7Ag/mV1QAPOx9SZli89nk7ZNsnsALm/d0Mp9FzCs2D/BeMO/hGVYXT7e6OTPLVSGGfKHPB+L1jqa2su1g/Z46gK9r5htVm9fUXgG/OJl5LdQlqX0CPDE/Fk5PBx6sZ9jcPN3i4gzfMw+65/cZdrI5ysxoATuPtvP8hjgXzNdB7bswn+zwOtVesXnh7YXNE/NweELtydsDvFB7MA97zyTwYD3dDPBmmTOL6wNEmLSODpaZeiGA8XhufOCupmNtO5paFfDEPNl8gvk8eHvF4alqr8T5HLBODu9mAk/eXgt1qrcH83B2ncyTw0tinsDDBDKO2J5EEiUcbUoHpC5Y3x1/jhdA5VXmt8DZbQDz6+vjfG3zc3B4dQ8tL6+evTRa+/jS+la+EI4vB0mOBl5jPsynhmJ8UqDyDTi7NSM9gXmj7D73yGAVmIeag31N7Qk8jgEm1+vqOlIKnnV0ZN7f3Lp/F1Q+GfxmsL6x/ujrq8qbxnS3oFuCtVnZ0br3hbf3U3pbzm+AMKZ7wgfm7vcM7e6a4UbPokwIIcPq6VR7EgAEklrQ6tOQs99/tP3UzuZjvABqv13Y/FG+pa5VSl5QblX9rPxQ6ALPPLcs1kI2fyMiwIzSYF5XEGMcjuHMUTFcO28IZWRAM4TDSzAvPk3Oij4RwH3Nxz7f2dwG5tuE2u889YrGxJqqht/kVTedXxVr5Ctw3BatPb+4LHYmJ9R0tbrYeTUt/MbyOpP69zRveNlET/DV8fABWfD8o5HwjLD7/sFsNsWuHb4paY5SPXizdLpPwO85doLD4QnmCfzWpmMbaSEbYk3718H28xDqViK3z0VevzQR6hbBCc7zR/fSvDmRamMS8NNTUeFN8gT5BF8ZH1sa5WOcCW/vLDmnzhtglpr1zEtv9w34tuN8F9R+B5gvaD3Bt8WaJ9JC7kLIQ2HDV8PTr2k5zlc2t/NcCGkJgM+PVPEcZHw3B8sL5gYrp9H8633hfdPBNoW6b8H7TyyrcWYFq+4bAzsfgVA3VGR4nqAAaXKt1IOXNcGkVAgq8zvg7Xcdf0lT+U1N7XwtMrx18eM6h7SorLpoPrK7bIS6m8PRp9TFXg+QWknrCYtaXh2j/JUiwxti9dTQuXSTQw8eTjCloNWHPQDmdwq1b+P3tr/A8xoahLfe3PKcYP5OqD7K2bpl5dWNt+FYFIm9SXH+1lAFz65reWqKLA+h+TP9UaOW5LiCb41zBn4y2lmyGkfd1Uh4KMkZ4vQL8KwreHKAfTEegM0rDg/entLb+taVAnz8ROsagM9DUUP1/HLV5iPVfD7C2vxYYwPNmx2I/pI+Z3i9I2bgN6WkRVXnDr6JcvZlYfNQ+WHo8ow4YB9Nc9PM8s+6qP0nfYGd7Wk/CfBgnpIcJDVIbzXns7H1xOk8CGBloqRdiixvOfzC/EDVD9TF3uSPfjKrtOJ7qgAmuwOHJ5fVJkpaVHVU2MDxXWWR1otrUMmlIwp0AX+mT8Dvbj72xq4E8wJ8A0ramsZ71cUgtV27Mlr362UVsZ3LymvvTF7kTcHKX+Og9LZjesimhT8yhWtdwe3XyP4HRzpLHh7ucNygXock53Samtursd7mSX2oM8QNAx9oP3lqJ+xdzfDuRlFzD+x9fXXjs1/GRnagwoGGJp9DGR6KmpmB6N/RyFhx0WtQRwxxlpzKgH3rwKPQGXbItTzlzId4fvqzLxkm7I4/L0JdfkMLJ/Cb4OQ2orhZV9f8BuxdWl3VNJkWtwj5/eJITFpUUf8+1fOU28+hTg5Cm+jhweNP9gTjE+TA0+NttqvompGO0g1oYZUOR8U3BOVs19xeqH9fjFwwT88F8+9SqBNqnwBPhQ15e0py8lDprcRvy6qbRD2/AHGeurdzRTOjQgNPbSy0rvkktLLGI9mhJIcyPCpph1KoA/hBYDotOb2VAqfEfkCqh9Kt5QPua2j6cQGcnlrVEfMbAJTifHIDU83w1NY1FTbJzIseHpwZ0lvh8JROjtLGEuBR2Q2yJIG3l/B4HN3cxL5AqvFrzytoaX9rW5Laa8wnurfL0b3VwIepb0/1fBfwYHwyjolgO9G356Pg7ZHbdzJPPTzN4blf6DPA6oNzeXzg3fX18wqQ8NyNtFYwT2oP5kntqYdHcV5tY2HHJgEenRyot2rz0wGcNi0mYtNiHPXt0cwYlYjzxHymqvYE3uL6uM+B0wLQzkqjdtLWxpafbkO2pwMvkhylk0PMKzs2Snqrd3gR0bqerKo9NiyyRCcnSe3RvRU2j6ou84B5MTY1lT2/Ph9gn9awpfpoZAuqO9XmV6vgk6o6xeYrhcOjUNfJvNir05gX4NHDGwHbVpiHzTv9PN1mzmf8xUG6jc6+F4Cy07op1my7C95fqH0CvLB5tK+07m1ix0Y4PD/ifEmETyPmhdqTw6O+PW1aUHoL8JTbwxwyzY6tjLa4+93gtJOKXVmMdVX1396IZIcamMlq3xnqVOZVmwd4cnik9okdG2J+lLpp4Q5+ONjqXQW2+yHwbpjYUVoxAentydV18UQzo1aJ88LhKRuVc9Q4j+bFdQK8ovbC25Pa4/fhxW678C3dtML6nQKoC6ItZeqsrq6quj23vK58BTUzYPud3l5v8wrzSHKQ8VEba7Tbb1xo8I4Q98vHGxv9cYOyN9JfHIw9srSszHJruOLo3ED0k7kQxqxwNZ/pjbw71V8evk72W8f5fCJXv+zB9kYwl99cs/OHukWb5UdRbDzKipLOm6Vl4pxFeoSZ3au1+Vb3Ev21mEfD4twn5tIwO6czo3O7Ns8obda+m13fxe94lrwj9YIzSr9jJvllZrEvTFrQJvG9yPk084aVRZtkpf10SB7JjFIlNhmPKMBkrWWdmOcSn0bpIVzjVAQhf4c5S37O9u1T9uPM0ovi0+H7BStyPKOccwZwXmlupmyovTOjLFpSykJcCvhCcw6z+5WmhgpenWP1vKfM7QF4k/ygmCsHTirXJMBb3PrWFRKglOFmZvModsS5TgEnvUbeWHxHp1Ucxb5T2mK6gjc6S3oN3uoz68CbpD/owHoiKQRfXPJHMNeKox1q1wA1VLopKvOe8Dn2DATUHfNm6aw4b3UfZvsdU8R3o3EKdl2Lle9Jaq8yX+jMYlIgDkErQk1mmnZzLK6PUsc8vR2RPMzSF8qivIraK+A4o41He0k5AK1nRxxPYJEdzOpYpfxunY99tnPssC0foM7ChhUHaPNK2IBsE9+LfYra03D6LczmaxTfTfbZzB35FNfsEJuVJnmLbj1X/rgigSsSuCKBKxK4IoGvIYFD8lR2CKGmyDGhR60ki2sik5HaXhaDsiU60EpizmCWtuaD1vHMW46YKv0VcfXPSHDOMzc2DS2usi/FZZI8SEv39Ap7TVsKM7buVka5O2VW6ij24W/vJN1UIzI0dFz+5+B7JalvYnIyeJN8BsVFz9iwYx/d6KxGNoatZDQcjXKZjnkqU22du7Ji6XSOrlOH0T5D+077dsWeacyAf0EptO1BxshRNT52AWR60aEQ1STa3Xh1xYnnjrt0sSSDNzoPILdGf1JpUF50/MgwUgjJ5FJeNDK5noGZfK4DT/cxy0/o7kEmZpYPaucCVZ2CNstbcT1ndt853G83228ei3t+plV6dJHROEyY6hG7UvIaUeZS2qsWXL2WQle1N8n/Ytg3E77AiDz9sP1adiCof+/VJP1F5PHJo6vNXwp4em7yMLpvh0A+005ZnEchkFd0c8yuA0wtn782eMGk9Dic3ftg6UMcHSg88A6sd4N2b5K+zXZNSsAnv31Jzz0oZeueSw7adKlvanVlvjvpWex+Ri8F2qEFNEorLvQL3xTzyeDxzs4FyyPwl/yyUk/A0xNpERZ5qXi4t4wigtJuVscF4P29t/nu1F7HPELuIWnNBcybZaV30OtBDQMViN33AStyd/siMSOpG5QXFWCHZ7WGRid4v87hmaR3IKwndeuRv8LhfRV4o1yCe/5JL3S5Ev7nnZ7hLpI/ZQcs89j+4mkILf9mZvs/tQvNSGpM8LjYKGRHiguYAXZtctQLtdI1MO2HhR8wIqkpsmazYjgqo3ROH+qkZ0XkKLTnsCLpftGVUV4uuri3/yrw9P82pAk273uig2SUT8HeO3oGnGYdKt6NBbyKmPsWs/1W77TUuxQ6t6FVfAbHR8xc/Fi3N9+7dxBS379BWJGLPvywbQGE8jEz2h/u+QJ7MPNw8feB4TMQ86sezL4y5f9WAv8F+9I+h18fJogAAAAASUVORK5CYII="
            };
        })();
        
        //PUBLIC API:
        return {
            musics: musics,
            sounds: sounds,
            images: images
        };
    })();
    //END MODULE: JSduino.objects
    
    //BEGIN MODULE: JSduino.events
    /* Sub-Namespace 'events' dentro del namespace 'JSduino'.
     * Trata los distintos eventos para elementos tanto de la 
     * interfaz gráfica de usuario como del propio 'core' */
    _JSduino_.events = (function (){
        //FROM UTILS.js 
        /** Polifill cross-browser para los manejadores de eventos.
          * @param el {DOMElement} [DEFAULT: <b>document</b>] El elemento sobre el que aplicar el evento
          * @param eventName {string} [DEFAULT: "DOMContentLoaded"] Nombre del evento a manejar (sin el prefijo "on")
          * @param fn {function} Función a implementar en el evento pasado 
          * @param bubble {boolean} permite el efecto burbuja en la cadena de eventos */
        function addEvent(el, eventName, fn, bubble){
            el = el ? el : document;
            eventName = eventName ? eventName : "DOMContentLoaded";
            bubble = (bubble === undefined) ? false : bubble;
            
            function toEvent(el, eventName, fn, bubble){
                var eventNameCapitalized = (eventName.charAt(0).toUpperCase() + eventName.slice(1));
                if(el.addEventListener){ //Casi todos
                    el.addEventListener(eventName, fn, bubble);
                    return true;
                } else if(el.attachEvent){ //Microsoft
                    return el.attachEvent("on" + eventNameCapitalized, fn);
                } else { // resto navegadores
                    try{
                        el["on"+eventName] = fn;
                        return true;
                    } catch(e){
                        throw System.out.println('ERROR:: No es posible añadir evento');
                        return false;
                    }
                }
            } 
            
            return toEvent(el, eventName, fn);
        }
        /** Polifill cross-browser para eliminar manejadores de eventos.
          * @param el {DOMElement} [DEFAULT: <b>document</b>] El elemento al que suprimir el evento
          * @param eventName {string} [DEFAULT: "DOMContentLoaded"] Nombre del evento a suprimir (sin el prefijo "on")
          * @param fn {Function} Función (HANDLER) a desconectar del evento pasado
          * @param useCapture {boolean} Debe ser igual al parámetro "bubble" pasado al crearlo.
          */
        function removeEvent(el, eventName, fn, useCapture){
            el = el ? el : document;
            eventName = eventName ? eventName : "DOMContentLoaded";
            useCapture = (useCapture === undefined) ? false : useCapture;
            var eventNameCapitalized = (eventName.charAt(0).toUpperCase() + eventName.slice(1));
            if(el.removeEventListener){ //Casi todos
                el.removeEventListener(eventName, fn, useCapture);
                return true;
            } else if(el.detachEvent){ //Microsoft
                return el.detachEvent("on" + eventNameCapitalized, fn);
            } else { // resto navegadores
                try{
                    el["on"+eventName] = undefined;
                    return true;
                } catch(e){
                    throw System.out.println('ERROR:: No es posible eliminar el evento "' + eventName + '"');
                    return false;
                }
            }
            //removeEventListener(event.type, nombredelafuncion)
        }
        /** Dispara un evento por su nombre sobre un elemento dado. 
          * @param el {DOMElement} [DEFAULT: <b>document</b>] El elemento sobre el que disparar el evento
          * @param eventName {string} [DEFAULT: "click"] Nombre del evento a disparar (sin el prefijo "on")
          * @param props {object} [OPTIONAL] [DEFAULT: {'bubbles': true, 'cancelable': true}] Objeto opcional de propiedades a pasar al evento */
        function simulateEvent(el, eventName, props) {
            el = el ? el : document;
            eventName = eventName ? eventName : "click";
            props = props ? props : 
                {
                    'view': window,
                    'bubbles': false,
                    'cancelable': true
                };
            var event;
          try{
              event = new Event(eventName, props);
          }catch(e){
              console.log("Error al utilizar el constructor 'Event' probablemente en IE, probando con el polyfill 'CustomEvent' ... " + e);
              event = new CustomEvent(eventName, props);
          }
          if(el.dispatchEvent){
              event.cancelled = !el.dispatchEvent(event);
          }
          return event;
        }
        //END UTILS.js
        
        // MANTIENE UN CONTROL SOBRE LOS EVENTOS ASIGNADOS A CADA OBJETO MEDIANTE UN ARRAY DE LISTENERS
        // PERMITIENDO SÓLO UN ÚNICO EVENTO DEL MISMO TIPO PARA CADA ELEMENTO.
        // EL ÚLTIMO EVENTO DEL MISMO TIPO SOBREESCRIBIRÁ AL ANTERIOR EN EL ARRAY.
        function hasListener(el, eventType){
            for(var i=0; i<listeners.length; i++){
                list = listeners[i]; //{el: DOMElement, eventType: 'click', handler: function_handler, bubble: true}
                //list.el.removeEventListener(list.eventType, list.handler);
                if((list.el.id === el.id) && (list.eventType === eventType)){ return true; }
            }
            return false;
        }
        function resetListeners(){
            for(var i=0; i<listeners.length; i++){
                list = listeners[i]; //{el: DOMElement, eventType: 'click', handler: function_handler, bubble: true}
                //list.el.removeEventListener(list.eventType, list.handler);
                removeListener(list.el, list.eventType, list.handler, list.bubble);
            }
        }
        function setListener(el, eventType, handler, bubble){
            //SELLO SI NO DISPONE DE ID
            var abc = "abcdefghijklmnopqrstuvwxyz";
            var rnd = abc[_JSduino_.utils.getRandomInt(0, abc.length-1)] + "_" + _JSduino_.utils.getRandomInt(10000, 100000);
            el.id = el.id ? el.id : rnd;
            if(hasListener(el, eventType)){ /*return;*/ removeListener(el, eventType, handler, bubble); }
            var result = addEvent(el, eventType, handler, bubble);
            if(result){
                listeners.push({el: el, eventType: eventType, handler: handler, bubble: bubble});
            }
        }
        function removeListener(el, eventType, handler, bubble){
            removeEvent(el, eventType, handler, bubble);
            var index = false;
            for(var i=0; i<listeners.length; i++){
                list = listeners[i]; //{el: DOMElement, eventType: 'click', handler: function_handler, bubble: true}
                //list.el.removeEventListener(list.eventType, list.handler);
                if((list.el.id === el.id) && (list.eventType === eventType)){ 
                    index=i;
                    break;
                }
            }
            if(index !== false){
                listeners.splice(index, 1);
            }
        }
        
        //POLIFILL de ev.target para IE
        function getTarget(ev){
            function isEvent(ev){
                var evTarget = ((ev.target || ev.srcElement) ? ev : undefined);
                return (evTarget && ((ev instanceof Event) || (ev.originalEvent instanceof Event)));
            }
            return (isEvent(ev) ? (ev.target || ev.srcElement) : ev);
        }
        
        //HANDLERs
        /*function clearClick(ev){
            _JSduino_.core.clear();
        }
        function resetClick(ev){
            _JSduino_.core.reset();
        }
        function startStopClick(ev){
            if(ledPower.innerHTML == "O"){
                _JSduino_.core.start();
            } else if(ledPower.innerHTML == "I"){
                _JSduino_.core.stop();
            }
        }*/
        
        //PUBLIC API:
        return {
            addEvent: addEvent,
            removeEvent: removeEvent,
            simulateEvent: simulateEvent,
            
            getTarget: getTarget,
            //switcheMouseDown: switcheMouseDown,
            //switcheMouseUp: switcheMouseUp,
            //selectChange: selectChange,
            //clearClick: clearClick,
            //resetClick: resetClick,
            //startStopClick: startStopClick,
            getListeners: function(){ return listeners; },
            setListener: setListener,
            removeListener: removeListener,
            hasListener: hasListener,
            resetListeners: resetListeners
        };
    })();
    //END MODULE: JSduino.events
    
    //BEGIN MODULE: JSduino.effects
    /* Sub-Namespace 'effects' dentro del namespace 'JSduino'.
     * Trata distintos effectos para aplicar a elementos tanto de la 
     * interfaz gráfica de usuario como del propio 'core', pero que
     * sean 'Objetos-Raphael' */
    _JSduino_.effects = (function (){
        //FROM UTILS.js
        /** Borra un elemento del DOM con efecto incorporado */
        function remove(el){
            //alert("qitando elemento... " + el);
            el.style.visibility = "hidden";
            el.style.width = "25%";
            el.style.left = "50%";
            el.style.transition = "all 0.3s";
            _JSduino_.events.addEvent(el, "hover", function(ev){
                ev.target.style.width = "1%"; //_WIDTH_HIDE_
                //ev.target.display = "none";
                setTimeout(function(){
                    if(ev && ev.target && ev.target.parentNode) { ev.target.parentNode.removeChild(ev.target); }
                }, 350);
            }, false);
            _JSduino_.events.simulateEvent(el, "hover");
        }
        /** Muestra un elemento del DOM con efecto incorporado */
        function show(el, withWidth, widthRelative){
            _WIDTH_SHOW_ = 0;
            withWidth = (withWidth == undefined) ? true : withWidth;
            //el.style.transition = "opacity 1s linear";
            el.style.visibility = "visible";
            el.style.display = "block";
            el.style.opacity = "0.2";
            el.style.right = "0";
            //el.style.width = (el.offsetWidth/4) + "px";
            //el.style.width = (el.offsetWidth*0.93) + "px";
            
            if(withWidth){ 
                var w = parseInt(el.offsetWidth);
                //alert(w);
                w = w + w*0.40;
                //alert(w);
                //el.style.width = el.offsetWidth + "px";
                el.style.width = w + "px";
            }
            //if(withWidth){ el.style.width = "20px"; }
            el.style.transition = "all 0.6s";
            _JSduino_.events.addEvent(el, "hover", function(ev){
                ev.target.style.opacity = "1";
                //ev.target.style.right = "30%";
                //if(withWidth){ ev.target.style.width = (_WIDTH_SHOW_ + ev.target.offsetWidth) + "px"; }
                el.style.width = widthRelative ? widthRelative : ("100%");
            });
            _JSduino_.events.simulateEvent(el, "hover");
        }
        /** Oculta un elemento del DOM con efecto incorporado */
        function hide(el, withWidth, widthRelative){
            withWidth = (withWidth == undefined) ? true : withWidth;
            //el.style.transition = "opacity 1s linear";
            el.style.visibility = "visible";
            el.style.display = "block";
            el.style.opacity = "1";
            //el.style.right = "33%";
            
            //if(withWidth){ el.style.width = "30%"; }
            //if(withWidth){ el.style.width = "20px"; }
            /*if(withWidth){ 
                //ev.target.style.width = "20%";
                var w = parseInt(el.offsetWidth);
                //alert(w);
                w = w - w*0.20;
                //alert(w);
                //el.style.width = el.offsetWidth + "px";
                el.style.width = w + "px";
            }*/
            el.style.width = widthRelative ? widthRelative : ("80%");
            el.style.transition = "all 0.6s";
            _JSduino_.events.addEvent(el, "hover", function(ev){
                ev.target.style.opacity = "0.2";
                //el.style.right = "0";
                el.style.width = el.offsetWidth + "px";
                if(withWidth){ 
                    //ev.target.style.width = "20%";
                    var w = parseInt(el.offsetWidth);
                    //alert(w);
                    w = w - w*0.40;
                    //alert(w);
                    //el.style.width = el.offsetWidth + "px";
                    el.style.width = w + "px";
                }
            });
            _JSduino_.events.simulateEvent(el, "hover");
            setTimeout(function(){el.style.visibility = "hidden"; el.style.display = "none";}, 600);
        }
        //END UTILS.js
        
        //MINI-CLASE PARA Glow-bear
        var Glower = (function(){
            /** CONSTRUCTOR:: elemento tipo 'raphael', y los atributos a cambiar del efecto 'glow' (fill, color, ...). */
            function Glower(elRaphael, objAttr){
                this.elRaphael = elRaphael;
                this.objAttr = objAttr;
                //glow = this.elRaphael.glow(this.objAttr);
                this.glow = null;
            }
            Glower.prototype.on = function(){
                if(!this.glow) { this.glow = this.elRaphael.glow(this.objAttr); }
                return this;
            }
            Glower.prototype.off = function(){
                if(this.glow) { this.glow.remove(); this.glow = null; }
                return this;
            }
            /** Efecto Parpadeo (sólo del desenfoque). Permite especificar como parámetros la cantidad de parpadeos, 
              * el lapsus entre ellos y su estado final. 
              * @param count {number} número de parpadeos deseados. 
              * @param lapsus {number} milisegundos de pausa entre parpadeos. (aproximadamente)
              * @param onOff {boolean} Estado final: TRUE=ON, FALSE=OFF */
            Glower.prototype.blink = function(count, lapsus, onOff){
                count = count || 0;
                lapsus = lapsus || 200;
                onOff = (onOff !== undefined) ? onOff : true;
                var interval = setInterval(function(t){ t.on(); }, lapsus, this);
                setTimeout(function(){ clearInterval(interval); }, (lapsus * 1.25));
                this.off();
                if(count>0) { 
                    setTimeout(function(t){ t.blink(--count, lapsus, onOff); }, (lapsus * 1.5), this);
                } else {
                    setTimeout(function(t){ t[(onOff ? "on" : "off")](); }, (lapsus * 1.5), this);
                }
                return this;
            }
            return Glower;
        })();

        //MINI-CLASE PARA ENCENDIDO/APAGADO/PARPADEO DE LOS LEDs
        var LEDer = (function(){
            /** CONSTRUCTOR:: el objeto 'paper' apuntando a 'Raphael', el nombre del led (ej: "led_on"), 
              * atributos a cambiar del cuerpo principal y la máscara (ej: {main: {"fill": "yellow"}, 
              * mask: {"fill": "green"}}), y los atributos (si se desean) para el efecto 'glow'. */
            function LEDer(paper, nameLED, objAttr, attrGlow){
                this.paper = paper;
                this.objLED = {
                    main: this.paper.getByDomId(nameLED + "_body_main"), 
                    mask: this.paper.getByDomId(nameLED + "_mask")
                };
                this.objAttr = objAttr; //{main: {"fill": "yellow"}, mask: {"fill": "green"}}
                this.objAttr_Original = (function getAttrs(el, newAttrs){
                    var objAttrs = {
                        main: newAttrs.main ? Object.assign({}, newAttrs.main) : "{}",
                        mask: newAttrs.mask ? Object.assign({}, newAttrs.mask) : "{}"
                    }
                    for(var i in newAttrs){ //i=main , mask, ...
                        if(newAttrs.hasOwnProperty(i)){
                            var attrs = newAttrs[i]; //{xxx: yyy, ...}
                            for(var j in attrs){ //j=fill, stroke, ...
                                if(el[i] && attrs.hasOwnProperty(j)){
                                    objAttrs[i][j] = el[i].attr(j); //fill = xxx, ...
                                }
                            }
                        }
                    }
                    return objAttrs;
                })(this.objLED, this.objAttr);
                this.glower = attrGlow ? new Glower(this.objLED.main, attrGlow) : null;
            }
            LEDer.prototype.on = function(){
                setTimeout(function(t) { 
                    t.objLED.main.attr(t.objAttr.main);
                    t.objLED.mask.attr(t.objAttr.mask); 
                }, 1, this);
                if(this.glower) { this.glower.on(); }
                return this;
            }
            LEDer.prototype.off = function(){
                setTimeout(function(t) {
                    t.objLED.main.attr(t.objAttr_Original.main);
                    t.objLED.mask.attr(t.objAttr_Original.mask); 
                }, 1, this);
                if(this.glower) { this.glower.off(); }
                return this;
            }
            /** Efecto Parpadeo (puede incluir también el del desenfoque). Permite especificar como parámetros 
              * la cantidad de parpadeos, el lapsus entre ellos y su estado final. 
              * @param count {number} número de parpadeos deseados. 
              * @param lapsus {number} milisegundos de pausa entre parpadeos. (aproximadamente)
              * @param onOff {boolean} Estado final: TRUE=ON, FALSE=OFF */
            LEDer.prototype.blink = function(count, lapsus, onOff){
                count = count || 0;
                lapsus = lapsus || 200;
                onOff = (onOff !== undefined) ? onOff : true;
                var interval = setInterval(function(t){ t.on(); }, lapsus, this);
                setTimeout(function(){ clearInterval(interval); }, (lapsus * 1.25));
                this.off();
                if(count>0) { 
                    setTimeout(function(t){ t.blink(--count, lapsus, onOff); }, (lapsus * 1.5), this);
                } else {
                    setTimeout(function(t){ t[(onOff ? "on" : "off")](); }, (lapsus * 1.5), this);
                }
                return this;
            }
            
            LEDer.prototype.clear = function(){
                this.objLED.main.attr(this.objAttr_Original.main);
                this.objLED.mask.attr(this.objAttr_Original.mask); 
            };
            return LEDer;
        })();

        //PUBLIC API:
        return {
            remove: remove,
            show: show,
            hide: hide,
            
            Glower: Glower,
            LEDer: LEDer
        };
    })();
    //END MODULE: JSduino.effects
    
    //BEGIN MODULE CLASS: JSduino.Code
    /* Class 'Code' dentro del namespace 'JSduino'.
     * Trata de construir la interfaz de usuario */
    _JSduino_.Code = (function (){
        var txt;
        function create(_super, codeArea){
            return new Code(_super, codeArea);
        }
        function Code(_super, codeArea){
            this._super = _super;
            this.codeArea = codeArea;
            //this.txt = codeArea.value;
            //txt = this.txt;
            //this.objJson = {code: '"' + this.codeArea.value + "'"};
        }
        Code.prototype.create = function _create(_super, codeArea){
            return new Code(_super, codeArea);
        }
        Code.prototype.clean = function _clean(){
            
        }
        Code.prototype.evaluate = function _evaluate(){
            //alert("CODE->EVALUATE:: " + typeof(this) + " :: \n" + txt + " :: \n" + this.document + " :: \n" + this.codeArea);
            //_JSduino_.core.A.toConsole("CODE->EVALUATE:: ", eval.call(this, this.codeArea.value));
            //_JSduino_.core.A.toConsole("CODE->EVALUATE:: ", eval(txt));
            //_JSduino_.core.A.toConsole("CODE->EVALUATE:: ", eval.call(this._super, this.codeArea.value));
            /**/
            //sustitución de 'eval'
            var tmpFunc = new Function(this.codeArea.value);
            alert("CODE->EVALUATE:: Preparado para ejecutar función semi-eval");
            this._super.A.toConsole("CODE->EVALUATE: RESULTADO:: " + tmpFunc.call(this._super));
            
            
        }
        Code.prototype.evalGlobal = function _evalGlobal(){
            var code = "this.global(function(){" + this.codeArea.value + "})";
            //sustitución de 'eval'
            var tmpFunc = new Function(code);
            //alert("CODE->EVAL-GLOBAL:: Preparado para ejecutar función semi-eval");
            this._super.A.toConsole("CODE->EVAL-GLOBAL: RESULTADO:: " + tmpFunc.call(this._super));
        }
        Code.prototype.evalSetup = function _evalSetup(){
            var code = "this.setup(function(){" + this.codeArea.value + "})";
            //sustitución de 'eval'
            var tmpFunc = new Function(code);
            //alert("CODE->EVAL-SETUP:: Preparado para ejecutar función semi-eval");
            this._super.A.toConsole("CODE->EVAL-SETUP: RESULTADO:: " + tmpFunc.call(this._super));
        }
        Code.prototype.evalLoop = function _evalLoop(){
            var code = "this.loop(function(){" + this.codeArea.value + "})";
            //sustitución de 'eval'
            var tmpFunc = new Function(code);
            //alert("CODE->EVAL-LOOP:: Preparado para ejecutar función semi-eval");
            this._super.A.toConsole("CODE->EVAL-LOOP: RESULTADO:: " + tmpFunc.call(this._super));
            
        }
        /*
        Code.prototype.loop = function(pars){
            alert("CODE->LOOP:: " + pars);
            this._super.loop(pars);
        }*/
        
        //MÉTODOS ESTÁTICOS:
        /** Extrae las funciones ("FunctionDeclaration" no "FunctionExpression") del código pasado.
          * Retorna una cadena con todas las funciones encontradas en el código. */
        Code.getCodeFunctions = function _getCodeFunctions(code){
            //PARSE AND CLEAN
            var codeGen = "";
            //ANALIZA Y DEPURA EL CÓDIGO CON ACORN Y ESCODEGEN, CON WALK LO MODIFICAMOS
            if(acorn){
                if(!acorn.walk){ return "'?'";}
                //PARSEAMOS, LIMPIAMOS Y OPTIMIZAMOS
                var acornOptions = {
                    ecmaVersion: 6,
                    sourceType: "script" //"module"
                }
                var ast = acorn.parse(code, acornOptions);
                //var bs = "", varDecl = "", tmplLiteral="", idd="";
                var arrFunctions = [];
                acorn.walk.simple(ast, {
                  FunctionDeclaration: function b(node){
                      //bs += (node.name + " :: " + node.value + "; ");
                      //console.log(node.id.name);
                      arrFunctions.push(node);
                  }/*,
                  BlockStatement: function b(node){
                      //bs += (node.name + " :: " + node.value + "; ");
                  },*/
                  /*VariableDeclaration: function(node) {
                    //if (node.kind == "let" || node.kind == "const") features.lexicalDecl = true;
                    varDecl += (node.kind + ",");
                  },
                  VariableDeclarator: function(node) {
                    //if (node.kind == "let" || node.kind == "const") features.lexicalDecl = true;
                    varDecl += (node.kind + ",");
                    varDecl.push();
                  },
                  TemplateLiteral: function(node) { 
                    tmplLiteral += (node.kind + "," + node.value);
                  },
                  Identifier: function(node) {
                    idd += (node.kind + " :: " + node.name + " :: " + node.value + ",");
                  }*/
                });
                /*console.log( acorn.walk.findNodeAt(ast, null, null, function b(nodeType, node){
                    if(nodeType == "FunctionDeclaration") { 
                        //bs += (nodeType + " :1: " + node.kink + " :2:" + node.name + " :3: " + node.value  + " :4: " + node.raw + "; ");
                        //bs += (node.parentNode + " :id: " + node.id.name + " :3: " + node.value  + " :4: " + node.raw + "; ");
                        //arrFunctions.push(node);
                    }
                }) );*/
                ast = acorn.parse("");
                ast.body = arrFunctions;
                //console.log("BlockStatement :: " + bs);
                /*console.log("VariableDeclarations :: " + varDecl);
                console.log("TemplateLiteral :: " + tmplLiteral);
                console.log("Identifier :: " + idd);*/
                
                
                if(escodegen){
                    codeGen = escodegen.generate(ast);
                    //console.log(code);
                }
            }
            
            return codeGen;
        }
        /** Obtiene, trata y retorna el código pasado (se supone que será el valor de un 'textarea'). 
          * Puede parsearse, optimizarse (suprimir comentarios), e incluir nuevos ámbitos o variables. 
          * También se utiliza para embeber en el código unas funciones de ralentización.
          * Este código se supone que se utilizará para embeber dentro de las funciones: 'preSetup', 'setup' o 'loop' */
        Code.getCode = function _getCode(code, parse, ralentizar){
            /* IDEA: inferir funciones genéricas que llamen a las funciones JSArduino sin tener que prefijarlas con 'A'*/
            parse = (((typeof parse)+"") == "undefined") ? true : parse;
            //MODIFICAR EL CÓDIGO FUENTE PARA MANIPULARLO LÍNEA A LÍNEA
            var linesSplit = code.split("\n");
            
            linesSplit.unshift("V.setLooping(true);");  //primera línea de código
            linesSplit.push("V.setLooping(false);");    //última línea de código
            //param_func_loop = new Function("(function(" + params_others_loop + "){var V = JSduino.V();var A = JSduino.A();" + codeAreaLoop.value + "})()");
            
            if(parse){ 
                code = Code.parseAndClean(linesSplit.join("\n"), ralentizar); 
            } else if(ralentizar) {
                code = Code.ralentizar(linesSplit.join("\n"), true);
            }
            
            //RECONSTRUYE LA SALIDA DE CÓDIGO INCLUYENDO LOS OBJETOS 'V' y 'A'
            linesSplit = [];
            linesSplit.push("(function(){var V = JSduino.V();var A = JSduino.A();");
            linesSplit.push(code);
            linesSplit.push("})()");
            
            //param_func_loop = new Function("(function(){var V = JSduino.V();var A = JSduino.A();" + linesSplit.join("\n") + "})()");
            //param_func_loop = new Function("(function(){var V = JSduino.V();var A = JSduino.A();" + escodegen.generate(ast) + "})()");
            return ( linesSplit.join("\n") );
        }
        
        /** Trata optimizandolo el código pasado (suprimir comentarios), e incluye nuevos ámbitos, variables y funciones de conveniencia. 
          * También se utiliza para embeber en el código unas funciones de ralentización. */
        Code.parseAndClean = function _parseAndClean(code, ralentizar){
            var ast = null;
            //ANALIZA Y DEPURA EL CÓDIGO CON ACORN Y ESCODEGEN, CON WALK LO MODIFICAMOS
            if(acorn){
                //PARSEAMOS, LIMPIAMOS Y OPTIMIZAMOS
                var acornOptions = {
                    sourceType: "script" //"module"
                }
                ast = acorn.parse(code, acornOptions);
                if(ralentizar && acorn.walk){
                    //INCLUYE UNA FUNCIÓN RALENTIZADORA
                    ast = Code.ralentizar(ast, false);
                }
                if(escodegen){
                    code = escodegen.generate(ast);
                    //console.log(code);
                }
            } else if(ralentizar) {
                code = Code.ralentizar(code, true);
            }
            
            return code;
        }
        /** Retorna un AST (árbol de síntaxis abstracta) (o string) embebiéndole en el código unas funciones de ralentización. */
        Code.ralentizar = function _ralentizar(codeOrAst, lineByLine){
            var acornOptions = {
                sourceType: "script" //"module"
            }
            if(lineByLine){
                //CASO_1:: INCLUYENDOLA MANUALMENTE LÍNEA A LÍNEA. (fallaría en algunos casos, por ejemplo en estamentos 'switch', en cadenas de múltiples líneas, ...)
                var linesSplit = codeOrAst.split("\n");
                for(var i=0; i<linesSplit.length; i++){
                    if(i%2 > 0){linesSplit.splice(i, 0, "(function(){var rest = (new Date()).getTime();while(rest > ((new Date()).getTime() - 10)){}})();");}
                    
                }
                //console.log(linesSplit);
                return linesSplit.join("\n");
            }else{
                //CASO_2: Mediante Walk. Más seguro y elegante
                var ralen = acorn.parse("(function(){var rest = (new Date()).getTime();while(rest > ((new Date()).getTime() - 10)){}})()", acornOptions);
                ralen = ralen.body[0];
                //console.log(ralen);
                //LO MODIFICAMOS PARA INSERTAR DENTRO DE CADA ESTAMENTO DE BLOQUE LA FUNCIÓN DE RETARDO
                acorn.walk.simple(codeOrAst, {
                      BlockStatement: function b(node){
                          //console.log(node.body);
                          var ul = node.body[node.body.length-1];
                          ralen.start = ul.end + 2;
                          //ralen.end += (ul.end + 2);
                          node.body.unshift(ralen);
                      }
                });
                return codeOrAst;
            }
        }
        
        //PUBLIC API:
        return Code;
    })();
    //END MODULE CLASS: JSduino.Code
    
    //BEGIN MODULE: JSduino.ino
    /* Sub-Namespace 'ino' dentro del namespace 'JSduino'.
     * Define y emula las funciones de Arduino.
     * El código externo a ejecutar debe introducirse a través del método 'setup()' y 'loop()'
     * como en Arduino. */
    _JSduino_.ino = (function (){
        //CONSTANTES DE TIEMPO PARA LOS TIMERs
        //var _TICKS_INTERVAL = 1000, _TICKS_INIT = 100, _TICKS_CLEAR = 100;
        //----------------------------------------------
        //La precisión para cálculos de valores
        var _PRECISION_ = 3;
        //para simular los 10 bits de precisión analógica (A0-A5)
        var _ANALOG_BITS_PRECISION_ = 1024;
        //milisegundos desde que inició el programa
        var msgs = 0;
        
        //FUNCIONES NO EXPORTABLES, PARA USO INTERNO
        //ATAJO A LA CONSOLA
        function toC(str, borrar){
            _JSduino_.core.A.toConsole(str, borrar);
        }
        /** Intenta buscar el pin de varias formas posibles, en los arrays de 'suscritos' o en el de 'pinModes'.
          * En caso de no encontrarlos en ninguno, retornará nulo. */
        function getPinById(id){
            //Toma el pin del array de actuadores
            var index = _JSduino_.utils.hasActuator(id);
            var pin = (index !== false) ? actuators[index].act.getPinSuscriteById(id) : null;
            if(pin) { console.log("digitalWrite:: tomando el pin existente del actuador.id = " + id); }
            //Toma el pin de los creados en el array de pinModes
            var p = getPinModeArrayById(id);
            pin = pin ? pin : (p ? p.el : null);
            return pin;
        }
        //COMODIDAD PARA OBTENER EL PIN DE LOS ESTABLECIDOS EN EL ARRAY 'pinModeArray' POR SU ID:
        function getPinModeArrayById(id){
            for(var i=0; i<pinModeArray.length; i++){
                var p = pinModeArray[i];
                if(p.id == id){ return p; }
            }
            return null;
        }
        //COMODIDAD PARA OBTENER EL ÍNDICE DE LOS ESTABLECIDOS EN EL ARRAY 'pinModeArray' POR SU ID:
        function getIndexPinModeArrayById(id){
            for(var i=0; i<pinModeArray.length; i++){
                var p = pinModeArray[i];
                if(p.id == id){ return i; }
            }
            return null;
        }
        //COMODIDAD PARA OBTENER EL ÍNDICE DE LOS ESTABLECIDOS EN EL ARRAY 'pinModeArray' POR EL PIN:
        function getIndexPinModeArrayByPin(pin){
            for(var i=0; i<pinModeArray.length; i++){
                var p = pinModeArray[i];
                if(p.id == pin.id){ return i; }
            }
            return null;
        }
        //pMode = {id: pin.id, el: pin, mode: mode}
        function createActuatorByPinMode(pMode){
            if(!pMode || !pMode.id || !pMode.el || !pMode.mode) { return null; }
            var deviceData = null;
            //buscamos el primer Device que tenga modo compatible con el pMode
            for(var i=0; i < objectDevices.length; i++){
                var od = objectDevices[i];
                if(od.modes.indexOf(pMode.mode) > -1){
                    deviceData = od; 
                    break;
                }
            }
            if(!deviceData) { return null; }

            var act = new _JSduino_.Actuator(pMode.el, deviceData.attrs.data); //ya se encarga el propio actuador de autoregistrarse
        }
        //-------------
        
        //FUNCIONES EXPORTABLES, PARA USO EXTERNO
        function delay(millis){
            _JSduino_.core.pause();
            setTimeout(function(){ 
                _JSduino_.core.resume();
                console.log("delay:: resuming.");
            }, millis);
            console.log("delay:: sleep for " + millis + " millisg.");
            /*var rest = (new Date()).getTime();
            while(rest < millis){
                rest = (new Date()).getTime() - rest;
            }*/
        }
        function pinMode(id, mode){
            id = (id + "").toUpperCase();
            mode = (mode + "").toUpperCase();
            //Se busca en los previamente creados
            var pin = _JSduino_.utils.getPinCompatible(id, [mode]); //Si hay alguno aprovechable se utiliza
            //Si no se encuentra se crea uno nuevo
            pin = pin ? pin : new _JSduino_.Pin(id, mode, null, null, true); //modo estricto
            if(!pin || pin.error){
                if(pin && pin.remove) { console.log("pinMode:: Borrado el pin temporal?... !" + (pin.remove() + "").toUpperCase() + "¡"); } //lo suprime del array genérico
                pin = null;
                toC("ERROR en pinMode:: pin [" + id + "], Modo = '" + mode + "'. ¡ID o MODO erróneo!");
                return null;
            }
            if(pin.mode !== mode) { pin.setMode(mode); }
            pin.er.attr("fill", "white"); //LO SEÑALA COMO ESTABLECIDO
            pin.setValue(0); //lo resetea
            var pMode = {id: pin.id, el: pin, mode: pin.mode};
            if(!getPinModeArrayById(id)){ pinModeArray.push(pMode); }
            console.log("pinMode:: pin [" + id + "] == '" + pin.pinDef.aka + "', setted to Mode = '" + pin.mode + "'");
            //AÑADIR UN ACTUADOR
            if(pin.actuatorsSuscrite.length == 0){
                createActuatorByPinMode(pMode);
            }
            return pin;
        }
        //DIGITAL
        function digitalRead(id){
            var forceFamily = ["DIGITAL"];
            id = (id + "").toUpperCase();
            //COMPRUEBA QUE SEA UNA FAMILIA PERMITIDA, LA FAMILIA (ANALOG)
            var familys = _JSduino_.Pin.getFamilysById(id);
            if(_JSduino_.utils.indexOfArray(familys, forceFamily) == -1){
                toC("digitalRead:: el ID:'" + id + "' [" + familys + "] no pertenece a las familias permitidas: '" + forceFamily + "'");
                return null;
            }
            //PRIMERO SI ES UN PIN CREADO CON ACTUADOR, SE UTILIZA ESTE
            var index = _JSduino_.utils.hasActuator(id);
            if(index !== false ){
                pin = actuators[index].act.getPinSuscriteById(id);
                console.log("digitalRead:: tomando el pin existente del actuador.id = " + id);
                //alert(actuators[index].act.name);
            } else if(!(pin = getPinModeArrayById(id))) {
                console.log("digitalWrite:: el ID:" + id + " no se configuró en el setup, se le asignará el modo por defecto...");
                pin = pinMode(id, null);
            }
            if(!pin) { return null; }
            return pin.getValue();
        }
        function digitalWrite(id, state){
            var forceMode = "OUTPUT";
            var forceFamily = "DIGITAL";
            id = (id + "").toUpperCase();
            state = (state === 0) ? "LOW" : ((state === 1) ? "HIGH" : state);
            state = (state + "").toUpperCase();
            //COMPRUEBA QUE ENTRE LOS MODOS SE ENCUENTRE "OUTPUT"
            if(_JSduino_.Pin.getModesById(id).indexOf(forceMode) == -1){ 
                console.log("digitalWrite:: ID:" + id + " no es del modo permitido '" + forceMode + "' para esta función.");
                return null;
            }
            //COMPRUEBA QUE SEA UNA FAMILIA PERMITIDA, LA FAMILIA (DIGITAL)
            var familys = null;
            if((familys = _JSduino_.Pin.getFamilysById(id).indexOf(forceFamily)) == -1){
                toC("digitalWrite:: el ID:'" + id + "' [" + familys + "] no pertenece a la familia permitida: '" + forceFamily + "'");
                return null;
            }
            
            var pin = _JSduino_.utils.getPinCompatible(id, [forceMode]); //Si hay alguno aprovechable se utiliza
            if(pin){
                if(pin.mode !== forceMode){
                    toC("digitalWrite:: el ID:" + id + " ya se encuentra configurado ['" + pin.mode + "'], no es compatible con escritura ['" + forceMode + "']");
                    return null;
                }
                console.log("digitalWrite:: ID:" + id + "['" + pin.mode + "'] configurado correctamente en el setup ... procediendo a su escritura.");
            } else {
                console.log("digitalWrite:: el ID:" + id + " no se configuró en el setup, se le asignará el modo de salida por defecto... '" + forceMode + "'");
                pin = pinMode(id, forceMode);
            }
            //console.log("digitalWrite:: pin:'" + id + "' [" + pin.familys + "] pertenece a la familia permitida: '" + forceFamily + "'");
            if(pin.state !== state) {
                var oldState = pin.state;
                pin.setState(state);
                console.log("digitalWrite:: pin [" + id + "] == '" + pin.pinDef.aka + "', from State ='" + oldState + "' to State = '" + pin.state + "'");
            }
            return pin;
        }
        //ANALOG
        /** <cite>Lee el valor de un determinado pin definido como entrada analógica con una resolución de 10 bits. 
          * Esta instrucción sólo funciona en los pines 'A0-A5'. El rango de valor que podemos leer oscila de 0 a 1023.
          * Los pins analógicos (0-5) a diferencia de los pines digitales, no necesitan ser declarados como INPUT u 
          * OUPUT ya que son siempre INPUT.</cite> 
          * @see @link{https://playground.arduino.cc/ArduinoNotebookTraduccion/AnalogIO} */
        function analogRead(id){ //10 bits //pines A0-A5 //0-1023
            var forceFamily = ["ANALOG", "PWM"]; //PWM
            id = (id + "").toUpperCase();
            //COMPRUEBA QUE SEA UNA FAMILIA PERMITIDA, LA FAMILIA (ANALOG)
            var familys = _JSduino_.Pin.getFamilysById(id);
            if(_JSduino_.utils.indexOfArray(familys, forceFamily) == -1){
                toC("analogRead:: el ID:'" + id + "' [" + familys + "] no pertenece a las familias permitidas: '" + forceFamily + "'");
                return null;
            }
            //PRIMERO SI ES UN PIN CREADO CON ACTUADOR, SE UTILIZA ESTE
            var index = _JSduino_.utils.hasActuator(id);
            if(index !== false ){
                pin = actuators[index].act.getPinSuscriteById(id);
                console.log("analogRead:: tomando el pin existente del actuador.id = " + id);
            } else if(!(pin = getPinModeArrayById(id))) {
                console.log("analogRead:: el ID:" + id + " no se configuró en el setup, se le asignará el modo por defecto...");
                pin = pinMode(id, null);
            }
            if(!pin) { return null; }
            var value = pin.getValue(); //  % 1023;
            //CONVERTIR EL VALOR TOTAL A VALORES EN SALTOS DE 0-1023
            var voltiosMax = 5;
            //FILTRA EL VALOR DE LOS PERMITIDOS EN SU ARRAY DE VALORES
            var arrValues = pin.pinDef.values; //[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];//pin.pinDef.values;
            var countValues = arrValues.length;
            //PARA QUE FUNCIONE LO SIGUIENTE, TODOS LOS VALORES DEL ARRAY DEBERÍAN ESTAR SEPARADOS AL MISMO ESCALÓN
            //var escalon = (arrValues.length > index+1) ? Math.abs(arrValues[index+1]-value) : null; //escalón con el mayor
            //escalon = escalon ? escalon : ((index-1) > -1 ? Math.abs(arrValues[index-1]-value) : 0); //sinó, escalón con el menor
            var index = arrValues.indexOf(value);
            //Si no encuentra el valor entre los permitidos, toma el más cercano (false==hacia abajo, true==hacia arriba)
            index = (index < 0) ? _JSduino_.utils.getIndexFromNearest(value, arrValues) : index;
            value = arrValues[index];
            /*
            var lecturaRealMax = voltiosMax*value;
            //Obtener ahora los valores siguiente y anterior en el array para marcar un rango.
            var siguiente = (arrValues.length > index+1) ? Math.abs(arrValues[index+1]) : value; //escalón con el mayor
            var anterior = ((index-1) > -1) ? Math.abs(arrValues[index-1]) : value; //sinó, escalón con el menor
            //se obtiene un rango aleatorio entre los valores anterior y siguiente (se supone que serán menor y mayor)
            var randomInRange = UTILS.NumberUtilities.getRandomFloat(anterior, siguiente);
            //alert("ant:" + anterior + ", val:" + value + ", sig:" + siguiente + ", alea:" + alea);
            
            //var rango = _ANALOG_BITS_PRECISION_ * value;
            var rango = _ANALOG_BITS_PRECISION_ * randomInRange;
            var voltiosPasos = voltiosMax/rango; //precisión de la medición en voltios (en torno a 5 mV)
            */
            var saltos = voltiosMax/countValues; //cuanto vale cada salto de index
            var valueCalculated = saltos * (index+1);
            return valueCalculated;//randomInRange * voltiosMax);
            /*//var result = (voltiosMax/_ANALOG_BITS_PRECISION_) * (rango * (1 - Math.random())); //window.crypto.getRandomValues();
            var result = voltiosPasos * (rango * (1 - Math.random())); //window.crypto.getRandomValues();
            return UTILS.NumberUtilities.roundTo(result, _PRECISION_); //redondea con x decimales*/
        }
        /** <cite>Esta instrucción sirve para escribir un pseudo-valor analógico utilizando el procedimiento de modulación por 
          * ancho de pulso (PWM) a uno de los pines de Arduino marcados como PWM. El más reciente Arduino, que implementa el 
          * chip ATmega368, permite habilitar como salidas analógicas tipo PWM los pines 3, 5, 6, 9, 10 y 11. Los modelos de 
          * Arduino más antiguos que implementan el chip ATmega8, sólo tiene habilitadas para esta función los pines 9, 10 y 11. 
          * El valor que se puede enviar a estos pines de salida analógica puede darse en forma de variable o constante, pero 
          * siempre con un margen de 0-255.</cite> 
          * @see @link{https://playground.arduino.cc/ArduinoNotebookTraduccion/AnalogIO} */
        function analogWrite(id, value){ //0-255
            var forceMode = "OUTPUT";
            var forceFamily = ["PWM"]; //"ANALOG", 
            id = (id + "").toUpperCase();
            
            //COMPRUEBA QUE ENTRE LOS MODOS SE ENCUENTRE "OUTPUT"
            if(_JSduino_.Pin.getModesById(id).indexOf(forceMode) == -1){ 
                console.log("analogWrite:: ID:" + id + " no es del modo permitido '" + forceMode + "' para esta función.");
                return null;
            }
            //COMPRUEBA QUE SEA UNA FAMILIA PERMITIDA, LA FAMILIA (ANALOG)
            var familys = _JSduino_.Pin.getFamilysById(id);
            if(_JSduino_.utils.indexOfArray(familys, forceFamily) == -1){
                toC("analogWrite:: el ID:'" + id + "' [" + familys + "] no pertenece a las familias permitidas: '" + forceFamily + "'");
                return null;
            }
            
            var pin = _JSduino_.utils.getPinCompatible(id, [forceMode]); //Si hay alguno aprovechable se utiliza
            if(pin){
                if(pin.mode !== forceMode){
                    toC("analogWrite:: el ID:" + id + " ya se encuentra configurado ['" + pin.mode + "'], no es compatible con escritura ['" + forceMode + "']");
                    return null;
                }
                console.log("analogWrite:: ID:" + id + "['" + pin.mode + "'] configurado correctamente en el setup ... procediendo a su escritura.");
            } else {
                console.log("analogWrite:: el ID:" + id + " no se configuró en el setup, se le asignará el modo de salida por defecto... '" + forceMode + "'");
                pin = pinMode(id, forceMode);
            }
            
            if(pin) {
                var oldValue = pin.value;
                //value //  % 1023;
                //CONVERTIR EL VALOR TOTAL A VALORES EN SALTOS DE 0-1023
                var voltiosMax = 5;
                //FILTRA EL VALOR DE LOS PERMITIDOS EN SU ARRAY DE VALORES
                var arrValues = pin.pinDef.values; //[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];//pin.pinDef.values;
                var countValues = arrValues.length;
                var index = arrValues.indexOf(value);
                //Si no encuentra el valor entre los permitidos, toma el más cercano (false==hacia abajo, true==hacia arriba)
                index = (index < 0) ? _JSduino_.utils.getIndexFromNearest(value, arrValues) : index;
                value = arrValues[index];
                var saltos = voltiosMax/countValues; //cuanto vale cada salto de index
                var valueCalculated = saltos * (index+1);
                value = valueCalculated;
                pin.setValue(value);
                console.log("analogWrite:: pin [" + id + "] == '" + pin.pinDef.aka + "', from Value ='" + oldValue + "' to value = '" + pin.value + "'");
            }
            
            return pin;
        }
        
        var Serial = (function (){
            function Serial(){
                this.baudios = 9600;
                this.txt = "";
            }
            Serial.prototype.begin = function(baudios){
                this.baudios = baudios;
                //alert("Serial.begin to " + baudios + " baudios.");
            }
            Serial.prototype.println = function(str){
                this.txt = str;
                //alert("Serial.println to '" + str + "'.");
                toC("(" + this.baudios + " bds.) :: " + str);
            }
            return new Serial();
        })();
        
        function setMillis(ms){
            msgs = ms;
        }
        function millis(){
            var d = new Date();
            return d.getTime() - msgs;
        }
        
        //PUBLIC API:
        return {
            getPinModeArrayById: getPinModeArrayById, //MÉTODO GENÉRICO, NO PENSADO PARA EL CORE
            delay: delay,
            pinMode: pinMode,
            digitalWrite: digitalWrite,
            digitalRead: digitalRead,
            analogRead: analogRead,
            analogWrite: analogWrite,
            Serial: Serial,
            setMillis: setMillis,
            millis: millis
        };
    })();
    //END MODULE:: JSduino.ino
    
    //BEGIN MODULE: JSduino.ui
    /* Sub-Namespace 'ui' dentro del namespace 'JSduino'.
     * Trata de construir la interfaz de usuario */
    _JSduino_.ui = (function (){
        var _MIN_CLICK_MILLIS_ = 1000; //minimo tiempo entre clickeos a botones
        var _DEBUG_ = false; //controla la visualización de la zona Debug y los botones de control asociados
        var ID_ROOT = "JSduino";
        var containers = {
            Root: null, //document.getElementById("JSduino"),
            Devices: null, //document.getElementById("JSduino-devices"),
            Actuators: null, //document.getElementById("JSduino-actuators"),
            Board: null, //document.getElementById("JSduino-board"),
            ContainerButtons: null,
            ButtonsAndCode: null, //document.getElementById("JSduino-buttonsAndCode"),
            CodeAreas: null,  //document.getElementById("JSduino-codeArea"),
            SVG: null, //document.getElementById("contSVG"),
            Buttons: null, //document.getElementById("JSduino-buttons"),
            Code: null, //document.getElementById("JSduino-code"),
            Console: null, //document.getElementById("JSduino-console"),
            Monitor: null,
            Messages: null, //document.getElementById("JSduino-messages"),
            Debug: null
        }
        var icons = {
            indicatorTraffic: null,
            spanButtonRunPause: null,
            spanButtonLoad: null,
            spanButtonSave: null,
            spanButtonViewSaved: null,
            spanButtonRestore: null,
            spanButtonCodeShowHideGlobal: null,
            spanButtonCodeShowHideSetup: null,
            spanButtonCodeShowHideLoop: null
        }
        //almacena el tiempo que ocurrió desde el último clickado en el botón indicado
        var t = {
            "btnRunPause": 0
        };
        
        
        /** Punto de entrada de la construcción de la Interfaz de usuario.
          * Crea la estructura HTML dinamicamente de la interfaz de usuario, osea, la placa ARDUINO UNO-R3;
          * @return divJSduino [HTMLDivElement] Objeto DIV-HTML que alberga toda la interfaz de usuario
          */
        function makeUI(){
            var divJSduino = makeRootZone();
            makeDevicesZone();
            makeActuatorsZone();
            makeBoardZone();
            makeShowButtonsZone();
            makeButtonsAndCodeZone();
            makeSVGZone();
            makeConsoleZone();
            makeMessagesZone();
            
            return divJSduino;
        }
        
        function makeRootZone(){
            containers.Root = document.getElementById(ID_ROOT);
            if(!containers.Root){
                containers.Root = document.createElement("div");
                containers.Root.id = ID_ROOT;
                document.body.insertBefore(containers.Root, document.body.firstChild);
            }
            //TITLE
            var title = document.createElement("h3");
            //id, caption, className, list
            title.className = "JSduino-title";
            title.innerHTML = 'JSduino III v0.5.0. || <span class="subtitle">Simulador de Proyectos Arduino en JS. &reg; <small>by <a href="mailto:dinertron@gmail" title="author">GuerraTron</a></small></span>';
            containers.Root.appendChild(title);
            
            return containers.Root;
        }
        function makeDevicesZone(){
            if(!containers.Root){ return null; }
            var devices = _JSduino_.getDevices();
            containers.Devices = document.createElement("ul");
            //id, caption, className, list
            containers.Devices.id = ID_ROOT + "-devices";
            containers.Devices.className = "devices";
            //Busca en los ancestros el elemento padre que tiene la propiedad 'data' asignada y lo retorna
            function toParentData(el){
                _JSduino_.deviceSel = el.getAttribute("data");
                var remarcar = _JSduino_.deviceSel ? el : el.parentNode;//para las imagenes
                if(!(remarcar && remarcar.parentNode) || !(el.getAttribute("data"))){ 
                    remarcar = toParentData(remarcar);
                } else {
                    //return null;
                }
                return remarcar;
            }
            //TRABAJA CON LA VARIABLE DEL OBJETO DE DEFINICIÓN DE DISPOSITIVOS
            function createEls(objDevs, father){
                for(var i=0; i<objDevs.length; i++){
                    var attrs = objDevs[i].attrs;
                    var el = document.createElement(attrs.type);
                    el.style.cursor = "pointer";
                    for(var p in attrs){
                        if(attrs.hasOwnProperty(p) && (p != "type")){
                            if(p == "inner") { 
                                el.innerHTML = attrs[p];
                                continue;
                            }
                            el.setAttribute(p, attrs[p]);
                        }
                    }
                    var children = objDevs[i].children;
                    if(children) { createEls(children, el); }
                    if((attrs.type == "li") && (attrs.data)) {
                        //_JSduino_.getDevices().push({"name": attrs.data, "el": el});
                        devices.push({"id": attrs.data, "name": attrs.data, "el": el, "types": objDevs[i].types, "modes": objDevs[i].modes});
                        /*el.addEventListener("click", function(ev){
                            //alert(ev.target.getAttribute("data") + " - " + ev.target.getAttribute("name"));
                            _JSduino_.deviceSel = ev.target.getAttribute("data");
                            devicesUnselect();
                            //var remarcar = _JSduino_.deviceSel ? ev.target : ev.target.parentNode;//para las imagenes
                            //_JSduino_.deviceSel = remarcar.getAttribute("data");
                            var remarcar = toParentData(ev.target);
                            if(remarcar){
                                //document.getElementById("msgs").innerHTML = remarcar.nodeType;
                                remarcar.style.setProperty("border", "2px solid yellow");
                                _JSduino_.deviceSel = remarcar.getAttribute("data");
                            }
                            if(ev.stopPropagation) { ev.stopPropagation(); } 
                            if(ev.preventDefault) { ev.preventDefault(); }
                        });*/
                        _JSduino_.events.setListener(el, "click", function(ev){
                            //alert(ev.target.getAttribute("data") + " - " + ev.target.getAttribute("name"));
                            _JSduino_.deviceSel = ev.target.getAttribute("data");
                            devicesUnselect();
                            _JSduino_.core.playSound("clickOn");
                            //var remarcar = _JSduino_.deviceSel ? ev.target : ev.target.parentNode;//para las imagenes
                            //_JSduino_.deviceSel = remarcar.getAttribute("data");
                            var remarcar = toParentData(ev.target);
                            if(remarcar){
                                //document.getElementById("msgs").innerHTML = remarcar.nodeType;
                                remarcar.style.setProperty("border", "2px solid yellow");
                                _JSduino_.deviceSel = remarcar.getAttribute("data");
                            }
                            if(ev.stopPropagation) { ev.stopPropagation(); } 
                            if(ev.preventDefault) { ev.preventDefault(); }
                        });
                        _JSduino_.events.setListener(el, "mouseover", function(ev){
                            _JSduino_.core.playSound("pase");
                        });
                    }
                    father.appendChild(el);
                }
            }
            function devicesUnselect(){
                for(var i=0; i<devices.length; i++){
                    devices[i].el.style.setProperty("border", "1px solid gray");
                }
            }
            
            createEls(_JSduino_.objectDevices, containers.Devices);
            //Inserta un elemento vacío al final (no se verá) para utilizarlo en CSS como fin de elementos flotantes
            containers.Devices.appendChild(document.createElement("li"));
            containers.Root.appendChild(containers.Devices);
            
            return containers.Devices;
        }
        function makeActuatorsZone(){
            if(!containers.Root){ return null; }
            containers.Actuators = document.createElement("ul");
            //id, caption, className, list
            containers.Actuators.id = ID_ROOT + "-actuators";
            containers.Actuators.className = "actuators";
            //containers.Actuators.className = inOut.className;
            /*var captionActuators = document.createElement("caption");
            captionActuators.innerHTML = "Actuators"; //inOut.caption;
            containers.Actuators.appendChild(captionActuators);*/
            //Inserta un elemento vacío al final (no se verá) para utilizarlo en CSS como fin de elementos flotantes
            containers.Actuators.appendChild(document.createElement("li"));
            containers.Root.appendChild(containers.Actuators);
            return containers.Actuators;
        }
        function makeBoardZone(){
            if(!containers.Root){ return null; }
            containers.Board = document.createElement("div");
            //id, caption, className, list
            containers.Board.id = ID_ROOT + "-board";
            //containers.Actuators.className = inOut.className;
            /*var captionBoard = document.createElement("caption");
            captionBoard.innerHTML = "Board"; //inOut.caption;
            containers.Board.appendChild(captionBoard);*/
            containers.Root.appendChild(containers.Board);
            return containers.Board;
        }
        function makeShowButtonsZone(){
            if(!containers.Root){ return null; }
            containers.ContainerButtons = document.createElement("div");
            containers.ContainerButtons.className = "containerButtons";
            
            var divLeft = document.createElement("div");
            divLeft.style.cssFloat = "left";
            containers.ContainerButtons.appendChild(divLeft);
            
            //LOGO
            var logo = document.createElement("img");
            logo.title = "JSduino by GuerraTron";
            logo.alt = "logo_JSduino";
            logo.className = "JSduino-logo";
            logo.src = "images/JSduino.png";
            //containers.ContainerButtons.appendChild(logo);
            divLeft.appendChild(logo);
            
            //STATE-INDICATOR
            var stateIndicator = document.createElement("span");
            stateIndicator.innerHTML = "&nbsp;"; //inOut.caption;
            stateIndicator.className = "indicator-traffic-24 indicator-traffic-red";
            stateIndicator.title = "STATE: running / delaying";
            //containers.ContainerButtons.appendChild(stateIndicator);
            divLeft.appendChild(stateIndicator);
            icons.indicatorTraffic = stateIndicator;
            
            makeButtonRunPause(containers.ContainerButtons);
            
            //SHOW BUTTONS
            var showButtons = document.createElement("button");
            showButtons.innerHTML = "&nbsp;"; //inOut.caption;
            showButtons.className = "showButtons toHide";
            showButtons.title = "Buttons Area";
            showButtons.style.margin = "auto";
            showButtons.style.marginBottom = "0.5em";
            _JSduino_.events.addEvent(showButtons, "click",  function (ev){
                showButtons.classList.toggle("toHide");
                if(showButtons.classList.contains("toHide")){
                    _JSduino_.core.playSound("hide");
                    //_JSduino_.effects.hide(containers.ButtonsAndCode, true, "100%");
                    _JSduino_.effects.hide(containers.ButtonsAndCode, false);
                    containers.ContainerButtons.style.removeProperty("width");
                }else{
                    _JSduino_.core.playSound("show");
                    //_JSduino_.effects.show(containers.ButtonsAndCode, true, "100%");
                    _JSduino_.effects.show(containers.ButtonsAndCode, false);
                    //containers.ContainerButtons.style.setProperty("width", "96%");
                }
                if(ev.stopPropagation){ ev.stopPropagation(); }
                if(ev.preventDefault){ ev.preventDefault(); }
            });
            /*_JSduino_.events.addEvent(showButtons, "mouseenter",  function (ev){
                _JSduino_.effects.show(containers.ButtonsAndCode, true, "100%");
                if(ev.stopPropagation){ ev.stopPropagation(); }
                if(ev.preventDefault){ ev.preventDefault(); }
            });
            _JSduino_.events.addEvent(showButtons, "mouseleave",  function (ev){
                _JSduino_.effects.hide(containers.ButtonsAndCode, true, "100%");
                if(ev.stopPropagation){ ev.stopPropagation(); }
                if(ev.preventDefault){ ev.preventDefault(); }
            });*/
            containers.ContainerButtons.appendChild(showButtons);
            
            //containers.ContainerButtons.appendChild(document.createElement("p"));
            containers.Board.appendChild(containers.ContainerButtons);
            return containers.ContainerButtons;
        }
        function makeButtonRunPause(parent){
            if(!containers.Root){ return null; }
            /*var clearfix1 = document.createElement("p");
            clearfix1.className = "clearfix";
            clearfix1.innerHTML = "&nbsp;";
            parent.appendChild(clearfix1);*/
            var btnRunPause = document.createElement("button");
            btnRunPause.id = "btnRunPause";
            btnRunPause.className = "run-pause";
            btnRunPause.title = "to Run Code. (UN/POWER the R3. START-STOP the actions and Timmers)";
            //btnRunPause.innerHTML = "Run &#x23F5;";//&#x1F320; = estr. fugaz ,&#x1F3C3; = 🏃, &#x1F39A; = 🎚, &#x1F31F; = 🌟, &#x1F5F2; = 🗲, &#x1F5F1; = 🗱, &#x23F5; = ⏵, &#x23F8; = ⏸,
            //btnRunPause.className = "icon icon-48";
            //btnRunPause.classList.toggle("icon-run");
            //btnRunPause.style.height = "50px";
            //btnRunPause.style.background = "aquamarine";
            btnRunPause.setAttribute("data-run", false);
            //alert(_JSduino_.events.hasListener(btnRunPause, "click"));
            _JSduino_.events.setListener(btnRunPause, "click", function(ev){
                if(!isInTime(t.btnRunPause)){ return; }
                var dataToRun = (btnRunPause.getAttribute("data-run") === "false");
                btnRunPause.title = (!dataToRun ? "Run Code" : "Pause Code");
                //btnRunPause.innerHTML = (dataToRun ? "Pause" : "Run"); //&#x23F8;, &#x23F5;
                //btnRunPause.classList.toggle(dataToRun ? "icon-pause" : "icon-run");
                //spanButtonRunPause.classList.toggle(!dataToRun ? "icon-pause" : "icon-run");
                //dataToRun != dataToRun;
                btnRunPause.setAttribute("data-run", dataToRun);
                //alert("initied= " + initied.isInitied + ", dataToRun=" + btnRunPause.getAttribute("data-run"));
                spanButtonRunPause.classList.toggle("icon-run");
                spanButtonRunPause.classList.toggle("icon-pause");
                //TODO: TO RUN-PAUSE
                if(dataToRun){
                    if(initied.isInitied){
                        //AUDIO-RESUME:: CONTINUA LA EJECUCIÓN (SUCESIVAS VECES AL PULSAR EL RUN-PAUSE)
                        _JSduino_.core.playSound("clickOn");
                        
                        //alert("resume");
                        //console.log("TO RESUME()");
                        _JSduino_.core.resume(); //no puedo decirle 'continue'
                    } else {
                        //AUDIO-RESET:: COMIENZA LA CARGA (1ª VEZ QUE SE PULSA EL RUN)
                        //_JSduino_.core.playSound("alert2");
                        //alert("reset");
                        //console.log("TO RESET()");
                        initied.isInitied = true;
                        _JSduino_.core.reset();
                    }
                } else {
                    //AUDIO-PAUSE:: PAUSE LA EJECUCIÓN (SUCESIVAS VECES AL PULSAR EL RUN-PAUSE)
                    _JSduino_.core.playSound("clickOff");
                    //alert("pause");
                    //console.log("TO PAUSE()");
                    _JSduino_.core.pause();
                    //_JSduino_.core.initied = false;
                }
            });
            //alert(_JSduino_.events.hasListener(btnRunPause, "click"));
            //_JSduino_.core.pause();
            //evento
            //_JSduino_.events.addEvent(btnStartStop, "click", handlerStartStopClick);
            parent.appendChild(btnRunPause);
            actions.push({id: "runPause", el: btnRunPause});
            var spanButtonRunPause = document.createElement("span");
            spanButtonRunPause.innerHTML = "&nbsp;";
            spanButtonRunPause.className = "icon icon-48 icon-run";
            btnRunPause.appendChild(spanButtonRunPause);
            icons.spanButtonRunPause = spanButtonRunPause;
        }
        function makeButtonsAndCodeZone(){
            if(!containers.Root){ return null; }
            //var actions = _JSduino_.getActions();
            containers.ButtonsAndCode = document.createElement("div");
            //id, caption, className, list
            containers.ButtonsAndCode.id = ID_ROOT + "-buttonsAndCode";
            containers.ButtonsAndCode.className = "buttonsAndCode hidden";
            //makeButtonRunPause(containers.ButtonsAndCode);
            
            //MUTE Button
            var btnMute = document.createElement("button");
            btnMute.id = "btnRestore";
            btnMute.style.fontSize = "larger";
            btnMute.title = "Altavoz";
            //btnRestore.innerHTML = "!! Reset !! &#x1F4A5;";
            _JSduino_.events.setListener(btnMute, "click",  function (ev){
                var silent = spanButtonMute.classList.contains("icon-mute-on");
                btnMute.title = !silent ? "Mute" : "Altavoz";
                _JSduino_.setMute(!silent);
                _JSduino_.core.playSound(!silent ? "silent" : "wakeUp");
                spanButtonMute.classList.toggle("icon-mute-off");
                spanButtonMute.classList.toggle("icon-mute-on");
            });
            containers.ButtonsAndCode.appendChild(btnMute);
            actions.push({id: "mute", el: btnMute});
            var spanButtonMute = document.createElement("span");
            spanButtonMute.innerHTML = "&nbsp;";
            spanButtonMute.className = "icon icon-48 icon-mute-off";
            btnMute.appendChild(spanButtonMute);
            icons.spanButtonMute = spanButtonMute;
            
            //CON EL FORMULARIO SE RECAARGA LA PÁGINA Y NO TENGO QUE RE-HACER LA UI.
            //QUE ME DABA INFINITOS PROBLEMAS CON LOS LISTENERS Y LOS TIMERS.
            //EL PROBLEMA QUE SE PIERDE TODO LO QUE NO SE TENGA GUARDADO AL PULSAR EL 'LOAD'.
            var frm = document.createElement("form");
            frm.method = "get";
            frm.action = "";
            frm.target = "_self";
            //frm.onsubmit = function(){alert(inputLoad.value);};
            containers.ButtonsAndCode.appendChild(frm);
            //FIELDSET LOAD
            var fieldsetLoad = document.createElement("fieldset");
            var legendLoad = document.createElement("legend");
            legendLoad.innerHTML = "Load";
            fieldsetLoad.appendChild(legendLoad);
            frm.appendChild(fieldsetLoad);
            //ÚNICO BOTÓN DENTRO DEL FORMULARIO. SE HA ANULADO EL LISTENER DE RECONSTRUCCIÓN DE INTERFAZ
            //POR LOS PROBLEMAS QUE GENERABA. ASÍ QUE AL PULSAR EL LOAD SE RECARGA LA PÁGINA ENTERA CARGANDO
            //EL ÚLTIMO ESTADO GUARDADO
            var btnLoad = document.createElement("button");
            btnLoad.id = "btnLoad";
            //btnLoad.name = "btnLoad";
            btnLoad.title = "WARNING!! All contents will are remade.\n Load the states, values, actuators and code.";
            //btnLoad.innerHTML = "Reload ! &#x1F504;"; //&x1F4E5; = 📥, &#x1F3F2; = 🏲, &#x1F501;🔁, &#x1F504; = 🔄
            //btnLoad.value = "";
            btnLoad.setAttribute("data-load", false);
            /*btnLoad.addEventListener("click", function(ev){
                 //_JSduino_.core.load(null, true);
                 _JSduino_.core.loadStore(1);
            });*/
            //_JSduino_.events.setListener(btnLoad, "click",  function (ev){ _JSduino_.core.loadStore(1); });
            //_JSduino_.events.setListener(btnLoad, "mousedown",  function (ev){ ev.target.value = "true"; });
            //containers.ButtonsAndCode.appendChild(btnLoad);
            fieldsetLoad.appendChild(btnLoad);
            actions.push({id: "load", el: btnLoad});
            var spanButtonLoad = document.createElement("span");
            spanButtonLoad.innerHTML = "&nbsp;";
            spanButtonLoad.className = "icon icon-48 icon-load";
            btnLoad.appendChild(spanButtonLoad);
            icons.spanButtonLoad = spanButtonLoad;
            
            //AHORA CREAMOS UN ELEMNETO OCULTO QUE RETENDRÁ LA INFO DEL OBJETO A CARGAR 'code' + 'objActuators'
            //AUNQUE ES INNECESARIO SI LO OBTENEMOS A TRAVÉS DEL ALMACENAMIENTO LOCAL.
            var inputLoad = document.createElement("input");
            inputLoad.id = "inputLoad";
            inputLoad.type = "hidden";
            inputLoad.value = "";
            fieldsetLoad.appendChild(inputLoad);
            actions.push({id: "inputLoad", el: inputLoad});
            
            var labelLoad = document.createElement("label");
            labelLoad.id = "labelLoad";
            labelLoad.innerHTML = "&#x1F4E4;"; //&#x1F4E5; = 📥, &#x1F4E4; = 📤
            labelLoad.setAttribute("for", "chkLoad");
            fieldsetLoad.appendChild(labelLoad);
            var chkLoad = document.createElement("input");
            chkLoad.id = "chkLoad";
            chkLoad.name = "chkLoad";
            chkLoad.title = "checking for load Saved State";
            chkLoad.type = "checkbox";
            chkLoad.checked = false;
            //_JSduino_.events.setListener(chkLoad, "change",  function (ev){ ev.target.value = "true"; });
            fieldsetLoad.appendChild(chkLoad);
            actions.push({id: "chkLoad", el: chkLoad});
            
            var fieldsetObject = document.createElement("fieldset");
            var legendObject = document.createElement("legend");
            legendObject.innerHTML = "Object Saved";
            fieldsetObject.appendChild(legendObject);
            containers.ButtonsAndCode.appendChild(fieldsetObject);
            
            var btnSave = document.createElement("button");
            btnSave.id = "btnSave";
            btnSave.style.fontSize = "larger";
            btnSave.title = "Save the states, values, actuators and code.";
            //btnSave.innerHTML = "Save &#x1F4BE;"; //&#x1F4BE; = 💾, &#x1F5AB; = 🖫
            btnSave.setAttribute("data-save", false);
            /*btnSave.addEventListener("click", function(ev){
                 _JSduino_.core.save();
            });*/
            _JSduino_.events.setListener(btnSave, "click",  function (ev){ 
                //_JSduino_.core.playSound("clickOn"); 
                _JSduino_.core.save();
            });
            //evento
            //_JSduino_.events.addEvent(btnStartStop, "click", handlerStartStopClick);
            //containers.ButtonsAndCode.appendChild(btnSave);
            fieldsetObject.appendChild(btnSave);
            actions.push({id: "save", el: btnSave});
            var spanButtonSave = document.createElement("span");
            spanButtonSave.innerHTML = "&nbsp;";
            spanButtonSave.className = "icon icon-48 icon-save";
            btnSave.appendChild(spanButtonSave);
            icons.spanButtonSave = spanButtonSave;
            
            //AYUDA: &#x1F4D6; = 📖
            //&#X1F6E0; = TOOLS, 
            
            var btnViewSaved = document.createElement("button");
            btnViewSaved.id = "btnView";
            btnViewSaved.style.fontSize = "larger";
            btnViewSaved.title = "Visualiza el objeto guardado.";
            //btnViewSaved.innerHTML = "View &#x1F440;"; //&#x1F440; = 00, &#x1F441; = 👁, &#x1F453; = 👓, 
            _JSduino_.events.setListener(btnViewSaved, "click",  function (ev){
                /*function PlaySound(soundObj) {
                  var sound = document.getElementById(soundObj);
                  alert(sound);
                  sound.Play();
                }
                PlaySound("sound1");*/
                //setTimeout(function(){(_JSduino_.getSounds()).beep.play(); }, 100);
                //_JSduino_.core.playSound("clickOn");
                var res = confirm("Pulse [ACEPTAR] para el objeto Actuadores, [CANCELAR] para el código");
                _JSduino_.core.viewSaved(res);
            });
            fieldsetObject.appendChild(btnViewSaved);
            actions.push({id: "view", el: btnViewSaved});
            var spanButtonViewSaved = document.createElement("span");
            spanButtonViewSaved.innerHTML = "&nbsp;";
            spanButtonViewSaved.className = "icon icon-100x100 icon-view-saved";
            btnViewSaved.appendChild(spanButtonViewSaved);
            icons.spanButtonViewSaved = spanButtonViewSaved;
            
            var btnRestore = document.createElement("button");
            btnRestore.id = "btnRestore";
            btnRestore.style.fontSize = "larger";
            btnRestore.title = "WARNING!!: Restaura el objeto guardado reseteandolo. Se perderán todos los datos guardados";
            //btnRestore.innerHTML = "!! Reset !! &#x1F4A5;";
            _JSduino_.events.setListener(btnRestore, "click",  function (ev){ 
                //_JSduino_.core.playSound("crack");
                _JSduino_.core.restoreSaved();
            });
            fieldsetObject.appendChild(btnRestore);
            actions.push({id: "restore", el: btnRestore});
            var spanButtonRestore = document.createElement("span");
            spanButtonRestore.innerHTML = "&nbsp;";
            spanButtonRestore.className = "icon icon-100x100 icon-restore";
            btnRestore.appendChild(spanButtonRestore);
            icons.spanButtonRestore = spanButtonRestore;
            
            //AREAS
            /*containers.CodeAreas = document.createElement("div");
            containers.CodeAreas.className = "codeAreas";
            containers.ButtonsAndCode.appendChild(containers.CodeAreas);*/
            //FIELDSET CODE-AREAS
            containers.CodeAreas= document.createElement("fieldset");
            containers.CodeAreas.className = "codeAreas";
            containers.ButtonsAndCode.appendChild(containers.CodeAreas);
            var legendCodeAreas = document.createElement("legend");
            legendCodeAreas.innerHTML = "Code";
            containers.CodeAreas.appendChild(legendCodeAreas);
            //containers.CodeAreas.appendChild(fieldsetCodeAreas);
            //MAKE AREAS: (GLOBAL, SETUP, LOOP)
            for(var i=0; i<areas.length; i++){
                makeGlobalArea(areas[i], containers.CodeAreas);
            }
                        
            //FIELDSET DEBUG
            if(_DEBUG_){
                var fieldsetDebug= document.createElement("fieldset");
                fieldsetDebug.className = "debugArea";
                containers.ButtonsAndCode.appendChild(fieldsetDebug);
                var legendDebug = document.createElement("legend");
                legendDebug.innerHTML = "Debug";
                fieldsetDebug.appendChild(legendDebug);
                 //UPDATE
                var spanSmall = document.createElement("span");
                spanSmall.className = "x-small steelBlue";
                spanSmall.innerHTML = "Updates (only outputs): ";
                var updater = document.createElement("input");
                updater.id = "updater";
                updater.className = "blue";
                updater.setAttribute("size", 25);
                updater.setAttribute("value", 0);
                //updater.value = "0";
                updater.setAttribute("placeholder", "probe outputs value");
                //updater.addEventListener("change", function (){ _JSduino_.utils.update(this); });
                _JSduino_.events.setListener(updater, "change",  function (ev){ 
                    _JSduino_.utils.update(this);
                    _JSduino_.core.playSound("light3");
                });
                spanSmall.appendChild(updater);
                actions.push({id: "updater", el: updater});
                fieldsetDebug.appendChild(spanSmall);
            }
            
            //containers.Root.appendChild(containers.ButtonsAndCode);
            //containers.Board.appendChild(containers.ButtonsAndCode);
            containers.ContainerButtons.appendChild(containers.ButtonsAndCode);
            return containers.ButtonsAndCode;
        }
        
        function makeGlobalArea(area, parent){
            /*var p = document.createElement("p");
            containers.CodeAreas.appendChild(p);*/
            var codeShowHide = document.createElement("button");
            codeShowHide.id = "codeShowHide" + area;
            codeShowHide.title = "code '" + area + "'";
            //codeShowHide.innerHTML = ((area == "Global") ? "&#x1F176;" : ((area == "Setup") ? "&#x1F182;" : ((area == "Loop") ? "&#x1F15B;" : area ) ) ) + " +";
            //codeShowHide.innerHTML = ((area == "Global") ? "&#x1F176;" : ((area == "Setup") ? "&#x1F1F8;" : ((area == "Loop") ? "&#x1F15B;" : area ) ) ) + " +";
            /*codeShowHide.addEventListener("click", function(ev){
                containers["CodeArea"+area].classList.toggle("hidden");
                _JSduino_.utils.getActionById("clearCode" + area).classList.toggle("hidden");
                ev.target.innerHTML = containers["CodeArea" + area].classList.contains("hidden") ? "+" : "-";
            });*/
            _JSduino_.events.setListener(codeShowHide, "click", function(ev){
                //containers["CodeArea"+area].classList.toggle("hidden");
                //_JSduino_.utils.getActionById("clearCode" + area).classList.toggle("hidden");
                var a = containers["CodeArea"+area];
                var clonArea = a.cloneNode();
                clonArea.id = a.id + "_Editor";
                clonArea.classList.toggle("hidden");
                
                setTimeout(function(){
                    _JSduino_.editArea.init({
                        id : clonArea.id,
                        //min_width : '99%',
                        min_height : 300,
                        language : 'es',
                        word_wrap : true,
                        font_size : 8,
                        replace_tab_by_spaces : 4,
                        syntax: 'js',
                        start_highlight: true
                    });
                    _JSduino_.editArea.show(clonArea.id);
                }, 200);
                
                makeModalAreas(
                    "", 
                    {
                        title: "CodeArea " + area,
                        area: clonArea,
                        sounds: {open: (_JSduino_.getSounds()).clickOn, close: (_JSduino_.getSounds()).clickOff},
                        callback: function(){
                            //a.value = clonArea.value;
                            a.value = _JSduino_.editArea.getValue(clonArea.id);
                            //_JSduino_.editArea.hide(clonArea.id);
                            _JSduino_.editArea.delete_instance(clonArea.id);
                        }
                    }
                ); //makeModalAreas(title, text, area, icon){
                //ev.target.innerHTML = containers["CodeArea" + area].classList.contains("hidden") ? (area + " +") : (area + " -");
            });
            parent.appendChild(codeShowHide);
            actions.push({id: "codeShowHide" + area, el: codeShowHide});
            var spanButtonCodeShowHide = document.createElement("span");
            spanButtonCodeShowHide.innerHTML = "&nbsp;";
            spanButtonCodeShowHide.className = "icon icon-48 icon-code-" + area;
            codeShowHide.appendChild(spanButtonCodeShowHide);
            icons["spanButtonCodeShowHide"+area] = spanButtonCodeShowHide;
            
            //CODE
            var codeArea = document.createElement("textarea");
            codeArea.id = "codeArea" + area;
            codeArea.className = "codeArea codepress javascript linenumbers-on";
            codeArea.innerHTML = "/*" + area + " Code:*/";
            codeArea.classList.toggle("hidden");
            var color = (area == "Loop") ? "lime" : ((area == "Setup") ? "orange" : "dodgerBlue");
            codeArea.style.color = color;
            containers["CodeArea" + area] = codeArea;
            parent.appendChild(codeArea);
            
            //CLEAR CODE
            /*
            var clearCode = document.createElement("img");
            clearCode.id = "btnClearCode" + area;
            clearCode.className = "btnClose";
            clearCode.src = "API/images/remove.png";
            clearCode.title = "Limpiar el código del área '" + area + "'";
            clearCode.classList.toggle("hidden");
            //Añadir evento 'click' mejor en 'core', para poder acceder a números de línea.
            //clearCode.addEventListener("click", function (){ containers.CodeArea.value = "/ * CONSOLE:: * /"; });
            containers.CodeAreas.appendChild(clearCode);
            actions.push({id: "clearCode" + area, el: clearCode});
            */
        }
        
        function makeSVGZone(){
            if(!containers.Root){ return null; }
            containers.SVG = document.createElement("div");
            //id, caption, className, list
            containers.SVG.id = _JSduino_._ID_SVG_;  //ESTE NOMBRE DEBE APARECER EN EL ARCHIVO 'svg.raphael.js'
            //containers.Actuators.className = inOut.className;
            /*var captionSVG = document.createElement("caption");
            captionSVG.innerHTML = "SVG"; //inOut.caption;
            containers.SVG.appendChild(captionSVG);*/
            //containers.Root.appendChild(containers.SVG);
            containers.Board.appendChild(containers.SVG);
            return containers.SVG;
        }
        function makeConsoleZone(){
            if(!containers.Root){ return null; }
            containers.Console = document.createElement("div");
            //id, caption, className, list
            containers.Console.id = ID_ROOT + "-console";
            containers.Console.className = "console";
            /*var captionConsole = document.createElement("caption");
            captionConsole.innerHTML = "Console"; //inOut.caption;
            containers.Console.appendChild(captionConsole);*/
            //CLEAR MONITOR
            var clearMonitor = document.createElement("img");
            clearMonitor.id = "btnClearMonitor";
            clearMonitor.className = "btnClose";
            clearMonitor.src = "API/images/remove.png";
            clearMonitor.title = "Limpiar la consola";
            //Añadir evento 'click' mejor en 'core', para poder acceder a números de línea.
            //clearMonitor.addEventListener("click", function (){ containers.Monitor.value = "/*CONSOLE::*/"; });
            containers.Console.appendChild(clearMonitor);
            actions.push({id: "clearMonitor", el: clearMonitor});
            //CODE
            containers.Monitor = document.createElement("textarea");
            containers.Monitor.id = "monitor";
            containers.Monitor.className = "monitor";
            containers.Monitor.innerHTML = "/*Console:*/";
            containers.Console.appendChild(containers.Monitor);
            
            containers.Root.appendChild(containers.Console);
            return containers.Console;
        }
        function makeMessagesZone(){
            if(!containers.Root){ return null; }
            containers.Messages = document.createElement("div");
            //id, caption, className, list
            containers.Messages.id = ID_ROOT + "-messages";
            containers.Messages.className = "messages";
            /**/
            var captionMessages = document.createElement("caption");
            captionMessages.innerHTML = "Messages"; //inOut.caption;
            containers.Messages.appendChild(captionMessages);
            
            containers.Root.appendChild(containers.Messages);
            return containers.Console;
        }
        /** Comprueba si el tiempo pasado entra dentro de los límites establecidos para el clickado rápido. */
        function isInTime(t){
            var d = new Date();
            d = d.getTime();
            if((t+_MIN_CLICK_MILLIS_) > d){
                console.log("click demasiado rápido... en menos tiempo del establecido como mínimo: " + _MIN_CLICK_MILLIS_);
                return false;
            }
            t = d;
            return true;
        }
        
        /** Crea una ventana semi-modal */
        function makeModal(title, text, code, charIcon, soundOpen, soundClose){
            var options = {
                title: title, 
                body: code, 
                logo: charIcon,
                mute: _JSduino_.getMute()
            };
            if(soundOpen){ options.sounds.open = soundOpen; }
            if(soundClose){ options.sounds.close = soundClose; }
            var mask = modal(text, options);
            mask.style.zIndex = "2000";
        }
        /** Crea una ventana semi-modal para las áreas de código con las opciones pasadas.
          * Para las opciones posibles ver la función original en UTILS.DOM.modal(..) */
        function makeModalAreas(text, options){
            //{title: title, area: area, logo: icon, sounds: {open:new Audio(..), close:new Audio(..)}, callback: fn}
            options.mute = _JSduino_.getMute();
            var mask = modal(text, options);
            mask.style.zIndex = "2000";
            return mask; //tiene la función mask.getArea() para obtener el textarea pasado
        }
        /** Crea una ventana semi-modal. ver las opciones posibles. 
          * EJEMPLO:
            var container = document.getElementById("contProv");
            var options = {
                title: "TITLE ALERT",
                body: "En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco y galgo corredor, ...", //null
                closeButton: true,
                callback: function(){ alert("saliendo de la ventana modal");}, //null
                millis: 6000, //0=sin límite
                modalParent: container, //null
                logo: "<img src='images/JSduino.png' />", //null
                sounds: {open:new Audio(..), close:new Audio(..)},
                mute: true || false
            }
            var modal = UTILS.DOM.modal("'el prerro de San roque no tenía rabo porque Ramón Ramírez se lo había corado'", options);
          */
        function modal(txt, optionsOuter){
            //Opciones por defecto
            var options = {
                title: "MSG-BOX",
                body: null,
                area: null, //un elemento puro del DOM
                others: null, //otros elementos puros del DOM
                closeButton: true,
                callback: null,
                millis: 0, //0=sin límite para el cierre (msg)
                modalParent: null,
                logo: null,
                sounds: {open: (_JSduino_.getSounds())["clickOn"], close: (_JSduino_.getSounds())["clickOff"]},
                mute: false
            };
            Object.assign(options, optionsOuter);
            
            //OPEN SOUNDS
            if(!options.mute && options.sounds && options.sounds.open){ setTimeout(function(){ options.sounds["open"].play(); }, 0); }
            
            //CLASS: modal, modal-text, modal-title, modal-logo
            var modal, mask, modalParent;
            modalParent = options.modalParent || document.body;
            //CIERRA LAS POSIBLES EXISTENTES EXCEPTO LA ÚLTIMA
            var modals = document.getElementsByClassName("modal");
            for(var i=0; i<modals.length; i++){
                if(i<modals.length-1){
                    modal = modals[i];
                    mask = modal.parentNode;
                    if(modal && modal.parentNode && mask && mask.parentNode) { 
                        mask.removeChild(modal); 
                        mask.parentNode.removeChild(mask);
                    }
                }
            }
            var position = options.modalParent ? "relative" : "absolute";
            mask = mask || document.createElement("div");
            mask.style.position = position;
            mask.style.width = "100%";
            mask.style.height = "100%";
            mask.style.margin = "0";
            mask.style.top = "0";
            mask.style.background = "#333333";
            mask.style.opacity = "0.8";
            _JSduino_.events.addEvent(mask, "click", function(ev){
                if(modal && mask) { closeModal(); }
                if(ev.preventDefault){ ev.preventDefault(); }
                if(ev.stopPropagation){ ev.stopPropagation(); }
            });
            modalParent.appendChild(mask);
            
            modal = modal || document.createElement("div");
            modal.className = "modal";
            modal.style.position = "relative";
            modal.style.width = "80%";
            modal.style.minHeight = "50%";
            modal.style.height = "680px";
            modal.style.maxHeight = "800px";
            modal.style.margin = "auto";
            modal.style.marginTop = "5%";
            modal.style.marginBottom = "5%";
            modal.style.background = "whiteSmoke";
            modal.style.border = "1px ridge gray";
            modal.style.borderRadius = "6px";
            modal.style.boxShadow = "2px 4px 4px silver";
            modal.style.overflow = "hidden";
            modal.style.opacity = "1";
            _JSduino_.events.addEvent(modal, "click", function(ev){
                mask.style.opacity = "1";
                if(ev.target.select) { ev.target.focus(); }
                if(ev.preventDefault){ ev.preventDefault(); }
                if(ev.stopPropagation){ ev.stopPropagation(); }
            });
            _JSduino_.events.addEvent(modal, "mouseenter", function(ev){
                mask.style.opacity = "0.9";
                if(ev.preventDefault){ ev.preventDefault(); }
                if(ev.stopPropagation){ ev.stopPropagation(); }
            });
            _JSduino_.events.addEvent(modal, "mouseleave", function(ev){
                mask.style.opacity = "0.8";
                if(ev.preventDefault){ ev.preventDefault(); }
                if(ev.stopPropagation){ ev.stopPropagation(); }
            });
            mask.appendChild(modal);
            
            var title = document.createElement("h1");
            title.className = "modal-title";
            title.innerHTML = options.title;
            title.style.textAlign = "center";
            title.style.color = "steelBlue";
            modal.appendChild(title);
            if(options.logo){
                var logo = document.createElement("i");
                logo.className = "modal-logo";
                logo.style.display = "inline";
                logo.innerHTML = options.logo;
                logo.style.maxHeight = "80px";
                logo.style.cssFloat = "left";
                logo.style.borderRadius = "1em";
                logo.style.padding = "0.1em";
                title.appendChild(logo);
                if(logo.firstChild.style){ logo.firstChild.style.maxHeight = "75px"; }
            }
            if(options.closeButton){
                var btnClose = document.createElement("i");
                btnClose.className = "modal-close";
                btnClose.innerHTML = "&times;";
                btnClose.style.display = "inline";
                btnClose.style.padding = "0.2em 0.4em";
                btnClose.style.background = "#333333";
                btnClose.style.color = "whiteSmoke";
                btnClose.style.fontWeight = "bolder";
                btnClose.style.fontSize = "xx-large";
                btnClose.style.cssFloat = "right";
                btnClose.style.marginRight = "0.5em";
                btnClose.style.borderRadius = "1em";
                btnClose.style.boxShadow = "1px 2px 2px gray";
                btnClose.style.cursor = "pointer";
                _JSduino_.events.addEvent(btnClose, "click", function(ev){
                    if(modal && mask) { closeModal(); }
                    if(ev.preventDefault){ ev.preventDefault(); }
                    if(ev.stopPropagation){ ev.stopPropagation(); }
                }, false);
                title.appendChild(btnClose);
            }
            
            var msg = document.createElement("p");
            msg.className = "modal-text";
            msg.innerHTML = txt;
            msg.style.clear = "both";
            msg.style.padding = "0.5em";
            msg.style.background = "lightYellow";
            msg.style.color = "#333333";
            msg.style.fontSize = "larger";
            modal.appendChild(msg);
            
            if(options.body){
                var body = document.createElement("blockquote");
                body.className = "modal-body";
                body.innerHTML = options.body;
                body.style.clear = "both";
                body.style.padding = "1em";
                body.style.background = "lightBlue";
                body.style.color = "#333333";
                body.style.borderRadius = "1em";
                body.style.margin = "auto";
                body.style.fontSize = "larger";
                body.style.borderRadius = "1em";
                body.style.boxShadow = "1px 2px 2px gray";
                modal.appendChild(body);
            }
            if(options.area){
                modal.appendChild(options.area);
            }
            if(options.others){
                modal.appendChild(options.others);
            }
            
            function closeModal(){
                setTimeout(function(){ 
                    if(options.callback){ options.callback(); } 
                    _JSduino_.effects.remove(modal); 
                    _JSduino_.effects.remove(mask);
                    //OPEN SOUNDS
                    if(!options.mute && options.sounds && options.sounds.close){ setTimeout(function(){ options.sounds["close"].play(); }, 0); }
                }, 100);
            }
            //Para ventanas de mensage temporal, se autocierran tras los milisegundos pasados
            if(options.millis){ setTimeout(function(){ if(options.callback){ options.callback(); } _JSduino_.effects.remove(modal); _JSduino_.effects.remove(mask); }, options.millis); }
            
            mask.getArea = function(){
                return options.area;
            }
            return mask;
        }
        
        //PUBLIC API:
        return {
                containers: containers,
                icons: icons,
                makeUI: makeUI, //PUNTO DE ENTRADA PARA CONSTRUIR TODA LA INTERFAZ
                makeModal: makeModal,
                makeModalAreas: makeModalAreas,
                modal: modal
            };
    })();
    //END MODULE: JSduino.ui
    
    //BEGIN MODULE: JSduino.core
    /* Sub-Namespace 'core' dentro del namespace 'JSduino'.
     * Trata de nuclearizar las funciones que controlan el ciclo de ejecución en "Arduino". 
     * Controlan Timmers y algunos eventos de botones de acción. 
     * Se debe invocar mediante el método 'init()' 
     * El código externo a ejecutar debe introducirse a través del método 'setup()' y 'loop()'
     * como en Arduino. */
    _JSduino_.core = (function (){
        //var mute = _JSduino_.getMute();
        var _CAD_SEP_SAVED_= "!||!";
        
        var _PRE_CODE = "var V = JSduino.V(); var A = JSduino.A(); var Serial = A.Serial;"; // String.prototype.length = function(){ return this.length; };
        var _POST_CODE = ";function delay(millis){return A.delay(millis);} function pinMode(pin, mode){return A.pinMode(pin, mode);} function digitalWrite(pin, value){return A.digitalWrite(pin, value);} function digitalRead(pin){return A.digitalRead(pin);} function analogWrite(pin, value){return A.analogWrite(pin, value);} function analogRead(pin){return A.analogRead(pin);} function millis(){ return A.millis();}";
        //----------------------------------------------
        var codeAreas = _JSduino_.getCodeAreas(); //NO SE ENCUENTRA DEFINIDO HASTA QUE NO HAYA CARGADO LA INTERFAZ. POR EJ. LLAMAR DENTRO DE INIT.
        var btnReset, btnRunPause, btnSave, btnLoad, inputLoad, btnView, btnRestore, btnShowHide, btnUpdater, consoleArea, btnClearMonitor, monitor;
        var codeAreaGlobal, codeAreaSetup, codeAreaLoop;
        var icons;
        /** Timer de ejecución que controla los TICKs */
        //t1 = null;
        //timers = _JSduino_.getTimers();
        //timeouts = _JSduino_.getTimeouts();
        //constantes
        var INPUT = "INPUT", OUTPUT = "OUTPUT", LOW = 0/*"LOW"*/, HIGH = 1/*"HIGH"*/;
        
        //Arrays definidos en JSduino.ui
        var param_func_loop, params_others_loop, param_func_setup, params_others_setup, param_func_preSetup, params_others_preSetup;
        var lOn, lLoad, lRx, lTx;
        initied.isInitied = false;
        /** EXPERIMENTAL!: Booleano que indica si se permite seguir atravesando el código o no. Esto sería válido si se inyectara en el 
          * código para evaluarse línea a línea. */
        var codeTraverse = true;
        var numLinesCode = 0, numLinesMonitor = 0;
        //Contenedor de variables de usuario (PRE-CODE)
        var V = {}; //_core_.V;
        //Contenedor de métodos 'Arduino'
        var A = new JSArduino(); //_core_.A;
        var looping = false; //indica si se está reproduciendo el 'loop'
        var objActuators = null;
        var codeFunctions = "";
        icons = _JSduino_.getIcons();

        //MÉTODO PRINCIPAL DE ENTRADA.
        function init(){
            //TIMERs
            removeTimers();
            removeTimeouts();
            //MUTE
            mute = _JSduino_.getMute();
            //_JSduino_.events.resetListeners();
            //BOTONERA
            btnReset = _JSduino_.utils.getActionById("btnReset"); //obj Raphael
            btnRunPause = _JSduino_.utils.getActionById("runPause"); //obj DOM
            btnSave = _JSduino_.utils.getActionById("btnSave"); //obj DOM
            btnLoad = _JSduino_.utils.getActionById("btnLoad"); //obj DOM
            inputLoad = _JSduino_.utils.getActionById("inputLoad"); //obj DOM
            btnView = _JSduino_.utils.getActionById("btnView"); //obj DOM
            btnRestore = _JSduino_.utils.getActionById("btnRestore"); //obj DOM
            btnShowHide = _JSduino_.utils.getActionById("codeShowHide"); //obj DOM
            btnUpdater = _JSduino_.utils.getActionById("updater"); //obj DOM //input
            //codeArea = _JSduino_.ui.containers.CodeArea; //obj DOM
            //btnClearCode = _JSduino_.utils.getActionById("clearCode");
            //btnClearCode.addEventListener("click", function (){ _core_.A.toCode("", true); });
            btnClearMonitor = _JSduino_.utils.getActionById("clearMonitor");
            //btnClearMonitor.addEventListener("click", function (){ _core_.A.toConsole("", true); });
            _JSduino_.events.setListener(btnClearMonitor, "click",  function (){ 
                playSound("remove");
                A.toConsole("", true);
            });
            
            setTimeout(function(){ playSound("light3"); }, 50); //"alert2"
            
            //areas = ["Global", "Setup", "Loop"];
            for(var i=0; i<areas.length; i++){
                if(areas[i] == "Global") {
                    codeAreaGlobal = _JSduino_.ui.containers["CodeArea" + areas[i]]; //obj DOM
                    //_JSduino_.events.setListener(_JSduino_.utils.getActionById("clearCode" + areas[i]), "click",  function (){ _core_.A.toCode(codeAreaGlobal, "", true); });
                }
                if(areas[i] == "Setup") { 
                    codeAreaSetup = _JSduino_.ui.containers["CodeArea" + areas[i]]; //obj DOM
                    //_JSduino_.events.setListener(_JSduino_.utils.getActionById("clearCode" + areas[i]), "click",  function (){ _core_.A.toCode(codeAreaSetup, "", true); });
                }
                if(areas[i] == "Loop")  { 
                    codeAreaLoop = _JSduino_.ui.containers["CodeArea" + areas[i]]; //obj DOM
                    //_JSduino_.events.setListener(_JSduino_.utils.getActionById("clearCode" + areas[i]), "click",  function (){ _core_.A.toCode(codeAreaLoop, "", true); });
                }
            }
            
            consoleArea = _JSduino_.ui.containers.Console; //obj DOM
            monitor = _JSduino_.ui.containers.Monitor; //obj DOM
            //LEDs
            lOn = _JSduino_.utils.getLedderById("ledOn");
            lLoad = _JSduino_.utils.getLedderById("ledLoad");
            lRx = _JSduino_.utils.getLedderById("ledRx");
            lTx = _JSduino_.utils.getLedderById("ledTx");
            
            icons = _JSduino_.getIcons();
            //CARGA EL ÚLTIMO ESTADO ALMACENADO antes de tomar el valor de los textareas
            load();
            
            /*param_func_preSetup = function(){};
            param_func_setup = function(){};
            param_func_loop = function(){};*/
            //alert(codeAreaGlobal.value);
            /*var pre = document.createElement("pre");
            pre.innerHTML = codeAreaGlobal.value;
            document.body.appendChild(pre);*/
            
            codeFunctions = _JSduino_.Code.getCodeFunctions(codeAreaGlobal.value);
            
            //param_func_preSetup = new Function("var a = function(" + params_others_preSetup + "){var V = JSduino.V();var A = JSduino.A();" + codeAreaGlobal.value + "}; a.call(this);");
            param_func_preSetup = new Function("(function(" + params_others_preSetup + "){\n" + _PRE_CODE + "\n" + codeAreaGlobal.value + "\n" + _POST_CODE + "\n})()");
            //param_func_preSetup = new Function("var V = JSduino.V();var A = JSduino.A();" + codeAreaGlobal.value);
            
            param_func_setup = new Function("(function(" + params_others_setup + "){\n" + _PRE_CODE + "\n" + codeAreaSetup.value + "\n" + codeFunctions + "\n" + _POST_CODE + "\n})()");
            param_func_loop = new Function("(function(" + params_others_loop + "){\n" + _PRE_CODE + "\n" + codeAreaLoop.value + "\n" + codeFunctions + "\n" + _POST_CODE + "\n})()");
            if(lOn && lOn.on) { lOn.on(); }
            initied.isInitied = false;
            //alert(btnRunPause.getAttribute("data-run"));
            if(btnRunPause.getAttribute("data-run") == "true"){
                //alert(true);
                /*stop();
                setup(param_func_setup);
                setTimeout(start, _TICKS_INIT);*/
                initied.isInitied = true;
                reset();
            }
        }
        /** remove all timers array */
        function removeTimers(){
            /*if(t1) { clearInterval(t1); }
            t1 = null;*/
            for(var i=0; i<timers.length; i++){
                clearInterval(timers[i]);
            };
            while(timers.length>0){ timers.pop(); }
        }
        /** remove all timeout array */
        function removeTimeouts(){
            /*if(t1) { clearInterval(t1); }
            t1 = null;*/
            for(var i=0; i<timeouts.length; i++){
                clearTimeout(timeouts[i]);
            };
            while(timeouts.length>0){ timeouts.pop(); }
        }
        function addTimer(func, interval, millis){
            interval = (((typeof interval)+"").toLowerCase() == "undefined") ? true : interval;
            if(interval){
                removeTimers();
                timers.push(setInterval(func, _TICKS_INTERVAL));
            } else {
                removeTimeouts();
                timeouts.push(setTimeout(func, millis || _TICKS_CLEAR));
            }
        }
        function destroy(){
            stop();
            //DELETE THE TIMERs
            removeTimers();
            removeTimeouts();
            initied.isInitied = false;
            codeTraverse = true;
            numLinesCode = 0;
            numLinesMonitor = 0;
            V = {}; //_core_.V;
            A = new JSArduino(); //_core_.A;
            looping = false; 
            //REMOVE EVENTS TO ACTION-BUTTONS
            //SUPRIMIR RESTO DE LISTENERs
            if(listeners.length>0){ 
                _JSduino_.events.resetListeners();
                listeners = [];
            }
        }
        /** INICIALIZA TODO Arduino, incluidas sus botones y pines. Para e Inicia la recursividad (setInterval) 
          * de la función principal: "runTick()".
          * Además descarga los parámetros de configuración y el código almacenado en memoria para ejecutar; hay 
          * que volver a cargarlos. */
        function clear(){
            //var enter = confirm("ACEPTAR = Reset Completo. (Se perderá todo el progreso), CANCELAR = Limpiar Pantalla.", "RESETEAR / LIMPIAR");
            destroy();
            //buttons = [];
            /*
            var parentContainer = getContainer().parentNode;
            parentContainer.removeChild(getContainer());
            setTimeout(function(){parentContainer.appendChild(_JSduino_.ui.makeUI(objectSwitches)); init();}, _TICKS_CLEAR);*/
            /*
            setTimeout(function(){
                _JSduino_.reInit(objActuators);
            }, _TICKS_CLEAR);*/
            
            //addTimer(function(){ _JSduino_.reInit(objActuators); }, false);
        }
        /** Resetea Arduino. Para e Inicia la recursividad (setInterval) de la función principal: "runTick()". 
          * Pero el código y los parámetros de configuración permanecen cargados en memoria. */
        function reset(){
            //console.log("IN RESET() :: " + (reset.caller).name);
            /*
             _core_.A.toCode(codeAreaGlobal, "", true);
             _core_.A.toCode(codeAreaSetup, "", true);
             _core_.A.toCode(codeAreaLoop, "", true);
            */
             A.toConsole("", true);
             
            stop();
            //notifyBtnRunPause(btnRunPause.getAttribute("data-run" == "false"));
            initied.isInitied = true;
            
            playSound("alert3");
            
            codeFunctions = _JSduino_.Code.getCodeFunctions(codeAreaGlobal.value);
            
            //param_func_preSetup = new Function("var a = function(" + params_others_preSetup + "){var V = JSduino.V();var A = JSduino.A();" + codeAreaGlobal.value + "}; a.call(this);");
            param_func_preSetup = new Function("(function(" + params_others_preSetup + "){\n" + _PRE_CODE + "\n" + codeAreaGlobal.value + "\n" + _POST_CODE + "\n})()");
            //param_func_preSetup = new Function("var V = JSduino.V();var A = JSduino.A();" + codeAreaGlobal.value);
            param_func_setup = new Function("(function(" + params_others_setup + "){\n" + _PRE_CODE + "\n" + codeAreaSetup.value + "\n" + codeFunctions + "\n" + _POST_CODE + "\n})()");
            
            /*param_func_preSetup = new Function("var a = function(" + params_others_preSetup + "){var V = JSduino.V();var A = JSduino.A();" + codeAreaGlobal.value + "}; a.call(this);");
            param_func_setup = new Function("(function(" + params_others_setup + "){var V = JSduino.V();var A = JSduino.A();" + codeAreaSetup.value + "})()");*/
            
            global(param_func_preSetup, params_others_preSetup);
            setup(param_func_setup, params_others_setup);
            //setTimeout(start, _TICKS_INIT);
            addTimer(start, false, _TICKS_INIT);
        }
        /** Para Arduino. Apaga y Detiene la recursividad (clearInterval) de la función principal: "runTick()" */
        function stop(){
            //if(ledPower) { ledPower.innerHTML = "O"; }
            if(lOn && lOn.off) { lOn.off(); }
            if(lLoad && lLoad.off) { lLoad.off(); }
            if(lRx && lRx.off) { lRx.off(); }
            if(lTx && lTx.off) { lTx.off(); }
            //UTILS.ClassName.removeClass(ledPower, "led-green");
            //UTILS.ClassName.addClass(ledPower, "led-red");
            removeTimers();
            notifyBtnRunPause(false);
        }
        /** Arranca Arduino. Inicia la recursividad (setInterval) de la función principal: "runTick()" */
        function start(){
            //if(ledPower) { ledPower.innerHTML = "I"; }
            //_JSduino_.utils.getLedderById("ledOn").off();
            //_JSduino_.utils.getLedderById("ledOn").blink(4, 150, true);
            if(lOn && lOn.off) { lOn.on(); }
            if(lLoad && lLoad.off) { lLoad.blink(5, ((_START_DELAY/5)-50), false); }
            if(lRx && lRx.off) { lRx.blink(3, 100, false); }
            if(lTx && lTx.off) { lTx.blink(3, 125, false); }
            //UTILS.ClassName.removeClass(ledPower, "led-red");
            //UTILS.ClassName.addClass(ledPower, "led-green");
            /*setTimeout(function(){
                removeTimers();
                addTimer(runTick);
                //t1 = setInterval(runTick, _TICKS_INTERVAL);
                notifyBtnRunPause(true);
            }, startDelay);*/
            addTimer(function(){ 
                //removeTimers();
                 notifyBtnRunPause(true);
                addTimer(runTick);
                //t1 = setInterval(runTick, _TICKS_INTERVAL);
                //notifyBtnRunPause(true);
            }, false, _START_DELAY);
        }
        /** Pausa el LOOP. Congela todo y detiene la recursividad (clearInterval) de la función principal: "runTick()"
          * Para continuar por donde lo habíamos dejado deberíamos ejecutar 'RESUME' o pulsar 'RUN' */
        function pause(){
            console.log("IN PAUSE() :: " + (pause.caller).name);
            removeTimers();
            removeTimeouts();
            //notifyBtnRunPause(false);
            icons.indicatorTraffic.className = "indicator-traffic-24 indicator-traffic-red";
            //alert("PAUSE()-> timers=" + timers.length + ", timeouts=" + timeouts.length);
        }
        /** Reaunuda el LOOP. DesCongela todo y renueva la recursividad (clearInterval) de la función principal: "runTick()"
          * continuando por donde lo habíamos dejado (seguramente al pulsar 'PAUSE')*/
        function resume(){
            //console.log("IN RESUME() :: " + (resume.caller).name);
            //removeTimers();
            //t1 = setInterval(runTick, _TICKS_INTERVAL);
            //notifyBtnRunPause(true);
            icons.indicatorTraffic.className = "indicator-traffic-24 indicator-traffic-green";
            addTimer(runTick);
            //notifyBtnRunPause(true);
            //alert("RESUME()-> timers=" + timers.length + ", timeouts=" + timeouts.length);
        }
        /** EXPERIMENTAL!: Conmuta permitir atravesar el código o no. Esto sería válido si se inyectara en el 
          * código para evaluarse línea a línea. */
        function toggleRun(){
            codeTraverse = !codeTraverse;
        }
        
        /** Función principal con recursividad. El ALMA-MATTER de JSduino */
        function runTick(){
            console.log("IN RUN-TICK :: " + (runTick.caller ? (runTick.caller).name : ("dataRun : " + btnRunPause.getAttribute("data-run"))));
            if(btnRunPause.getAttribute("data-run") == "false") {
                //console.log("TO PAUSE() ...");
                pause(); 
                return;
            }
            if(looping){ return; }
            //alert("ticck");
            
            codeFunctions = _JSduino_.Code.getCodeFunctions(codeAreaGlobal.value);
            
            //param_func_loop = new Function("(function(" + params_others_loop + "){" + pre_code + codeAreaLoop.value + post_code + "})()");
            //param_func_loop = new Function(_JSduino_.Code.getCode(codeAreaLoop.value, true, false)); //code, parse, ralentizar
            param_func_loop = new Function(_PRE_CODE + "\n" + _JSduino_.Code.getCode(codeAreaLoop.value, true, false) + "\n" + codeFunctions + "\n" + _POST_CODE); //code, parse, ralentizar
            loop(param_func_loop, params_others_loop);
            //readAllPines("alert(pin.id)");
            //readAllSwitches("alert(sel.id)");
            //readAllSelects("alert(select.id)");
            /*var yes = getSelectByPin(13);
            if(yes){ alert(yes.id); }*/
            /*var yes = getSwitcheByPin(13);
            if(yes){ alert(yes.id); }*/
            /*var yes = getPinByPin(13);
            if(yes){ alert(yes.id); }*/
        }
        
        /*
        function evaluate(code){
            var tmpFunc = new Function(code);
            alert("CORE->EVALUATE:: Preparado para ejecutar función semi-eval");
            tmpFunc.call(_JSduino_.core);
        }*/
        
        //ARDUINO
        /** ARDUINO: Función antes de la configuración de Arduino. 
          * Zona de definición de variables
          * Sólo se ejecuta una vez al inicio. (y cada vez que se pulsa RESET) */
        function preSetup(param_func, params_others){
            param_func_preSetup = param_func;
            params_others_preSetup = params_others;
            if(param_func) { param_func.call(this, params_others); }
        }
        /** Sinónimo de preSetup*/
        function global(param_func, params_others){
            preSetup(param_func, params_others);
        }
        /** ARDUINO: Función de configuración de Arduino llamada antes de "runTick()". 
          * Sólo se ejecuta una vez al inicio. (y cada vez que se pulsa RESET) */
        function setup(param_func, params_others){
            //var V = JSduino.V();var A = JSduino.A();
            param_func_setup = param_func;
            params_others_setup = params_others;
            if(param_func) { param_func.call(this, params_others); }
        }
        /** ARDUINO: Función principal llamada desde "runTick()". El ALMA-MATTER de Arduino, donde 
          * va todo el código púramente ARDUINO. */
        function loop(param_func, params_others){
            //setTimeout(function(){ icons.indicatorTraffic.className = "indicator-traffic-24 indicator-traffic-green"; }, 0);
            //notifyBtnRunPause(true);
            //var V = JSduino.V();var A = JSduino.A();
            param_func_loop = param_func;
            params_others_loop = params_others;
            if(param_func) { /*console.log(param_func()); */return param_func.call(this, params_others); }
            //notifyBtnRunPause(false);
            //icons.indicatorTraffic.className = "indicator-traffic-24 indicator-traffic-red";
        }
        
        function notifyBtnRunPause(runPause){
            btnRunPause.title = (runPause ? "Pause Code" : "Run Code" ); //btnRunPause.getAttribute("data-run" == "false")
            //btnRunPause.innerHTML = (runPause ? "Pause" : "Run");
            var cn = btnRunPause.childNodes;
            for(var h in cn){
                if(cn[h].nodeType == 1){ //1º Nodo no texto
                    //cn[h].classList.toggle(runPause ? "icon-run" : "icon-pause" );
                    /*cn[h].classList.toggle("icon-run");
                    cn[h].classList.toggle("icon-pause");*/
                    if(!runPause){
                        icons.indicatorTraffic.className = "indicator-traffic-24 indicator-traffic-red";
                        cn[h].classList.remove("icon-pause");
                        cn[h].classList.add("icon-run");
                        //icons.indicatorTraffic.classList.remove("indicator-traffic-green");
                        //icons.indicatorTraffic.classList.add("indicator-traffic-red");
                    } else {
                        icons.indicatorTraffic.className = "indicator-traffic-24 indicator-traffic-green";
                        cn[h].classList.remove("icon-run");
                        cn[h].classList.add("icon-pause");
                        //icons.indicatorTraffic.classList.remove("indicator-traffic-red");
                        //icons.indicatorTraffic.classList.add("indicator-traffic-green");
                    }
                    break;
                }
            }
            //btnRunPause.getElementById("span").classList.toggle(runPause ? "icon-pause" : "icon-run");
            //dataRun != dataRun;
            //alert("tenía: " + btnRunPause.getAttribute("data-run") + ", tiene: " + runPause);
            btnRunPause.setAttribute("data-run", runPause);
            //AUDIO:: COMIENZA LA CARGA (1ª VEZ QUE SE PULSA EL RUN)
            //setTimeout(function(){(_JSduino_.getSounds())[runPause ? "clickOn" : "clickOff"].play(); }, 100);
            //alert(notifyBtnRunPause.caller.name);
            /*
            if(runPause){
                if(initied.isInitied){
                    //console.log("TO RESUME()");
                    resume(); //no puedo decirle 'continue'
                } else {
                    //console.log("TO RESET()");
                    initied.isInitied = true;
                    reset();
                }
            } else {
                //console.log("TO PAUSE()");
                pause();
                //_JSduino_.core.initied.isInitied = false;
            }*/
        }
        
        /** Reproduce un sonido por su nombre almacenado en 'JSduino.objects.sounds' al cabo de un tiempo de espera. 
          * No puede detenerse el sonido. */
        function playSound(snd, maxDelay){
            if(_JSduino_.getMute()){ return; }
            snd = snd ? snd : "beep";
            snd = (_JSduino_.getSounds())[snd];
            if(!snd){ return; }
            maxDelay = maxDelay ? maxDelay : 0;
            setTimeout(function(){snd.play(); }, maxDelay);
        }
        
        function getV(){ return V; }
        
        function refreshActuators(){
            for(var i=0; i<actuators.length; i++) {
                var act = actuators[i].act;
                act.img.style.display = "none";
                setTimeout(
                    function(act, index){
                        //act.img.src = act.type.imgs[index];
                        act.img.style.display = "block";
                    }, 
                    1, 
                    act, 
                    i
                );
            }
        }
        
        function viewSaved(obj){ //obj=false => visualizar el código de los textarea, obj=true => visualizar el código del objeto
            var codeAll = _JSduino_.utils.getCookieStorage("JSArduino_saveAll");
            var code = codeAll ? codeAll.split(_CAD_SEP_SAVED_) : codeAll;
            var codeObj = (code && code.length>1) ? code[1] : null;
            //var objActs = (codeObj) ? JSON.parse(codeObj) : null;
            code = (code && code.length>0) ? code[0] : null;
            code = obj ? codeObj : code;
            _JSduino_.ui.makeModal("VIEW "+(obj ? "'Actuators'" : "'Code'"), "Estos datos se encuentran guardados:", "<pre style='border:1px solid gray; border-radius:4px; box-shadow:2px 2px 2px silver; margin:5%; overflow:auto; min-height: 150px; max-height: 350px;'><code style='color:#333333; background:lightYellow;'>" + code + "</code></pre>", '<img src="' + _JSduino_.getLogo() + '" title="JSduino logo" alt="logo_JSduino" />');
        }
        function restoreSaved(){
            var confirma = confirm("¿ Confirma eliminar los datos guardados ?");
            if(confirma){
                playSound("crack");
                var result = _JSduino_.utils.removeCookieStorage("JSArduino_saveAll");
                _JSduino_.ui.makeModal("SAVED", "Se ha intentado eliminar el objeto 'objActuators' guardado, el resultado es:", "<pre style='border:1px solid gray; border-radius:4px; box-shadow:2px 2px 2px silver; margin:5%; overflow:auto; min-height: 150px; max-height: 350px;'><code style='color:#333333; background:lightYellow;'>" + result + "</code></pre>", '<img src="' + _JSduino_.getLogo() + '" title="JSduino logo" alt="logo_JSduino" />');
            }else{
                playSound("clickOff"); 
            }
        }
        //SAVE CODE: El estado y objeto 'objectActuators' sólo se guardan en la opción 'default'
        function save(area){
            pause();
            var confirma = confirm("¿ Confirma guardar los datos actuales ?");
            if(confirma){
                playSound("clickOn");
            //for(var i=0; i<areas.length; i++){
                switch(/*areas[i]*/area){
                    case "Global":
                        saveGlobal(false);
                        break;
                    case "Setup":
                        saveSetup(false);
                        break;
                    case "Loop":
                        saveLoop(false);
                    default: //All
                        //throw new Error("CORE->SAVE:: No coincide ningún tipo de área de código");
                        //TOTAL:: JSON.parse(JSON.stringify(_JSduino_.utils.makeObjectActuators(actuators)));
                        //var objActuators = _JSduino_.utils.makeObjectActuators(actuators);
                        //var stringActuators = JSON.stringify(_JSduino_.utils.makeObjectActuators(actuators));
                        //Para recuperarlo: var objActuators = JSON.parse(stringActuators);
                        var stringActuators = JSON.stringify(_JSduino_.utils.makeObjectActuators(actuators));
                        //variable con el código de las funciones
                        codeFunctions = _JSduino_.Code.getCodeFunctions(codeAreaGlobal.value);
                        //console.log(code_functions);
                        //return;
                        
                        var code = codeAreaGlobal.value + "\n" + codeAreaSetup.value + "\n" + codeAreaLoop.value;
                        var saved = _JSduino_.utils.setCookieStorage("JSArduino_saveAll", code + _CAD_SEP_SAVED_ + stringActuators);
                        saved = saved && _JSduino_.utils.setCookieStorage("JSArduino_saveGlobal", codeAreaGlobal.value); //saveGlobal(false);
                        saved = saved && _JSduino_.utils.setCookieStorage("JSArduino_saveSetup", codeAreaSetup.value); //saveSetup(false);
                        saved = saved && _JSduino_.utils.setCookieStorage("JSArduino_saveLoop", codeAreaLoop.value); //saveLoop(false);
                        _JSduino_.ui.makeModal("SAVED", "<big style='background:" + (saved ? "lightGreen" : "coral") + ";'>Code 'saved = " + ((saved)+"").toUpperCase() + "' in local storage (cookies/localStorage)</big><br />For save to file, copy the text to clipboard.\n <small>This is for security purpose (cross-origin)</small>", "<pre style='border:1px solid gray; border-radius:4px; box-shadow:2px 2px 2px silver; margin:5%; overflow:auto; min-height: 150px; max-height: 350px;'><code style='color:#333333; background:lightYellow;'>" + code + "</code></pre>", '<img src="' + _JSduino_.getLogo() + '" title="JSduino logo" alt="logo_JSduino" />'); // "&ddotseq;" &there4; &ddotseq;
                }
            //}
            }else{
                playSound("clickOff"); 
            }
            resume();
        }
        function saveGlobal(actions){
            if(actions) { pause(); }
            //_JSduino_.Code.create(this, codeAreaGlobal).evalGlobal();
            _JSduino_.ui.makeModal("SAVE BY HAND", "For save, copy the text to clipboard.\n <small>This is for security pruposs (cross-origin)</small>", codeAreaGlobal.value, "&gopf;"); //&capbrcup; //ddotseq //&gopf;
            _JSduino_.utils.setCookieStorage("JSArduino_saveGlobal", codeAreaGlobal.value);
            if(actions) { resume(); }
        }
        function saveSetup(actions){
            if(actions) { pause(); }
            //_JSduino_.Code.create(this, codeAreaSetup).evalSetup();
            _JSduino_.ui.makeModal("SAVE BY HAND", "For save, copy the text to clipboard.\n <small>This is for security pruposs (cross-origin)</small>", codeAreaSetup.value, "&Sopf;"); //&capcup; //&Sopf;
            _JSduino_.utils.setCookieStorage("JSArduino_saveSetup", codeAreaSetup.value);
            if(actions) { resume(); }
        }
        function saveLoop(actions){
            if(actions) { pause(); }
            //_JSduino_.Code.create(this, codeAreaLoop).evalLoop();
            _JSduino_.ui.makeModal("SAVE BY HAND", "For save, copy the text to clipboard.\n <small>This is for security pruposs (cross-origin)</small>", codeAreaLoop.value, "&#10160;"); //&capcap;
            _JSduino_.utils.setCookieStorage("JSArduino_saveLoop", codeAreaLoop.value);
            if(actions) { resume(); }
        }
        //LOAD STORE:
        /**/
        function loadStore(index){
            //index=0 => "code areas", index=1 => "objActuators", index=2 => "btnLoad.value" or "chkLoad.checked"="on"
            index = index ? index : 0;
            var codeAll = _JSduino_.utils.getCookieStorage("JSArduino_saveAll");
            code = codeAll ? codeAll.split(_CAD_SEP_SAVED_) : codeAll;
            //objActuators = (code && code.length>1) ? JSON.parse(code[1]) : null;
            //clear();
            return (code && code.length>1) ? JSON.parse(code[1]) : null;
        }
        //LOAD CODE:
        function load(area, oActuators){
            var code = "";
            //pause();
            //for(var i=0; i<areas.length; i++){
                switch(/*areas[i]*/area){
                    case "Global":
                        code = loadGlobal();
                        break;
                    case "Setup":
                        code = loadSetup();
                        break;
                    case "Loop":
                        code = loadLoop();
                    default: //All
                    //alert("COOKIE (JSArduino_saveAll)->EXIST ? " + _JSduino_.utils.hasCookieStorage("JSArduino_saveAll"));
                        //throw new Error("CORE->SAVE:: No coincide ningún tipo de área de código");
                        var codeAll = _JSduino_.utils.getCookieStorage("JSArduino_saveAll");
                        code = codeAll ? codeAll.split(_CAD_SEP_SAVED_) : codeAll;
                        /*if(oActuators){ 
                            objActuators = (code && code.length>1) ? JSON.parse(code[1]) : null;
                            clear();
                            return;
                        }*/
                        //Almacena la información de los actuadores en el objeto 'objActuators' a través del input oculto 'inputLoad'
                        inputLoad.value = (code && code.length>1) ? code[1] : "";
                        //Ahora los textareas
                        code = (code && code.length>0) ? code[0] : code;
                        var codeGlobal = loadGlobal();
                        var codeSetup = loadSetup();
                        var codeLoop =  loadLoop();
                        //alert([codeAll, codeGlobal, codeSetup, codeLoop]);
                        if(codeGlobal) { codeAreaGlobal.value = codeGlobal; }
                        if(codeSetup){ codeAreaSetup.value = codeSetup; }
                        if(codeLoop){ codeAreaLoop.value = codeLoop; }
                        console.log("LOAD:: " + ((codeGlobal && codeSetup && codeLoop) ? "código cargado exitosamente" : "algún error al cargar el código"));
                }
            //}
            //resume();
            return code;
        }
        function loadGlobal(){
            return _JSduino_.utils.getCookieStorage("JSArduino_saveGlobal");
        }
        function loadSetup(){
            return _JSduino_.utils.getCookieStorage("JSArduino_saveSetup");
        }
        function loadLoop(){
            return _JSduino_.utils.getCookieStorage("JSArduino_saveLoop");
        }
        
        /** Función para uso interno. Establece la bandera para conocer si se está realizando el bucle 'loop' */
        V.setLooping = function(what){ looping = what; }
        
        //INTERNAL CLASS
        function JSArduino(){ 
            var d = new Date();
            _JSduino_.ino.setMillis(d.getTime());
        }
        JSArduino.prototype.toConsole = function(txt, clearConsole){
            if(clearConsole){ 
                monitor.value = "/* CONSOLE::MONITOR:: */";
                numLinesMonitor = 0;
                return;
            }
            if(monitor){ monitor.value += "\n" + (++numLinesMonitor) + ". \t" + txt; }
        };
        JSArduino.prototype.toCode = function(codeArea, txt, clearCode){
            //console.log(codeArea);
            if(clearCode){ 
                codeArea.value = "/* '" + codeArea.id + "' CODE:: */";
                numLinesCode = 0;
                return;
            }
            codeArea.value += "\n" + (++numLinesCode) + ". \t" + txt;
        };
        JSArduino.prototype.delay = function(millis){
            //pause();
            //setTimeout(function(){ resume(); }, millis);
            /*
//BLINK
    //SETUP
A.pinMode(5, "OUTPUT");
    //LOOP
console.log("--> LOW");
A.digitalWrite(5, "LOW");
A.delay(4000);
console.log("--> HIGH");
A.digitalWrite(5, "HIGH");
A.delay(4000);

//ALTERNATIVA:
V.on = !V.on;
if(V.on){
console.log("--> HIGH");
A.digitalWrite(5, "HIGH");
} else {
 console.log("--> LOW");
A.digitalWrite(5, "LOW");
}
A.delay(4000);
            */
            pause();
            setTimeout(function(){ 
                resume();
                console.log("delay:: resuming.");
            }, millis);
            /**/
            var rest = (new Date()).getTime();
            while(rest > ((new Date()).getTime() - millis - 10)){
                //rest = (new Date()).getTime() - rest;
                //REFRESCAR LA IMÁGEN
                for(var i=0; i<actuators.length; i++){
                    var act = actuators[i].act;
                    //console.log(act.img.src);
                    act.img.src = act.type.imgs[act.value];
                }
            }
            //refreshActuators();
            //_JSduino_.ino.delay(millis);
        };
        JSArduino.prototype.pinMode = function(id, type){
            var resultado = _JSduino_.ino.pinMode(id, type);
            //return resultado;
        };
        JSArduino.prototype.digitalWrite = function(id, state){
            var resultado = _JSduino_.ino.digitalWrite(id, state);
            //return resultado;
        };
        JSArduino.prototype.digitalRead = function(id){
            return _JSduino_.ino.digitalRead(id);
        };
        JSArduino.prototype.analogRead = function(id){
            return _JSduino_.ino.analogRead(id);
        };
        JSArduino.prototype.analogWrite = function(id, state){
            var resultado = _JSduino_.ino.analogWrite(id, state);
            //return resultado;
        };
        JSArduino.prototype.millis = function(){
            return _JSduino_.ino.millis();
        };
        JSArduino.prototype.Serial = (function(){
            return _JSduino_.ino.Serial;
        })();
        
        //PUBLIC API:
        return {
            init: init,
            clear: clear,
            reset: reset,
            stop: stop,
            start: start,
            pause: pause,
            resume: resume,
            removeTimers: removeTimers,
            save: save,
            load: load,
            loadStore: loadStore,
            viewSaved: viewSaved,
            restoreSaved: restoreSaved,
            playSound: playSound,
            V: V,
            A: new JSArduino(),
            preSetup: preSetup,
            setup: setup,
            loop: loop
        };
    })();
    //END MODULE: JSduino.core
    
    //BEGIN MODULE: JSduino.raphael
    /* Sub-Namespace 'raphael' dentro del namespace 'JSduino'.
     * Trata distintos effectos para aplicar a elementos tanto de la 
     * interfaz gráfica de usuario como del propio 'core', pero que
     * sean 'Objetos-Raphael' */
    _JSduino_.raphael = (function (){
        var paper = null;
        
        function scanPins(){
            setPinsHover();
        }
        
        /** Establece el evento HOVER (onmouseover) sobre un objeto 'raphael' a través de su 'id' de elemento SVG. 
          * Esta función se ha creado con la idea de trabajar sobre un objeto contenedor de todos los grupos del SVG, 
          * de tal forma que los recorre todos (DE FORMA RECURSIVA) y se supone que establece el efecto 'hover' sobre
          * cada uno de los pins encontrados.
          * Para que esto funcione los pines deben tener asignado un 'id' que empieze por 'hole' o 'center' y no terminen
          * en 'border'. */
        function setPinsHover(pines){
            //NOMBRE DE LOS GRUPOS QUE CONTIENEN LOS PINS DE CONEXIONADO
            //pines = pines || ["analogPins", "powerPins", "digitalPins_0_7", "digitalPins_8_17", "icsp1", "pin_icsp1_2"];
            //pines = pines || ["pins"];
            //for(var j=0; j<pines.length; j++){
            for(var j=0; j<pinsGroups.length; j++){
                //var pins = pines[j].split/*CADENA*/ ? pinsGroups[_JSduino_.utils.availableVarName(pines[j])] : pines[j]; //analogPins, powerPins, digitalPins_0_7, digitalPins_8_17, icsp1, icsp2
                var group =  pinsGroups[j];//[_JSduino_.utils.availableVarName(pinsGroups[j].id)];
                if(group){
                    group.group.forEach(function(el){
                        //COMPROBAR SI ES OTRO GRUPO
                        if((el.attr) && !(el.forEach)){// && !(pinsGroups[j].id.hasOwnProperty(el.attr("id")))){ //!(el.attr("id") in pinsGroups)){
                            var col = el.attr("fill") ? el.attr("fill") : "none";
                            var glow = null;
                            var id = el.attr("id");
                            if((id) && (id.substr) && ((id.substr(0,4) == "hole") || (id.substr(0,6) == "center")) && (id.substr(-6) != "border")){
                                id = id.replace("hole_", "").replace("center_", "");
                                glow = new _JSduino_.effects.Glower(el, {color: "yellow"});
                                //HOLES
                                el.attr({"cursor": "pointer"});
                                el.hover(
                                    function(ev) {
                                        _JSduino_.core.playSound("pop1"); //pase
                                      this.animate({ fill: '#00bbff', width: 50 }, 500);
                                      glow.on();
                                      this.transform("s2");
                                      //alert(this.attr("title")+"...");
                                      //if(!this.attr("title")){ this.attr({"title": "soy un título"}); }
                                      var index = _JSduino_.utils.hasActuator(id);
                                      if(index !== false){ actuators[index].act.highlight(true); }
                                    }, function(ev) {
                                      this.animate({ fill: col, width: 25 }, 500);
                                      glow.off();
                                      this.transform("s1");
                                      var index = _JSduino_.utils.hasActuator(id);
                                      if(index !== false){ actuators[index].act.highlight(false); }
                                    }
                                ).click(
                                    function(ev) {
                                        setPinsClick(this);
                                    }
                                );
                            } else { //NO PIN
                                //if(el.forEach) { setPinsHover([el]); }
                            }
                        } else { //GRUPO O ELEMENTO SIN ID
                            //if(el.forEach) { setPinsHover([el]); }
                        }
                    });
                }
            }
        }
        
        /** Establece el evento 'click' sobre un objeto 'raphael' que será entregado como parámetro. Se supone que 
          * esta función será llamada desde 'setPinsHover(..)' y trabajará sobre 'pines de conexionado'. */
        function setPinsClick(el){
            el.rotate(45);
            setTimeout(function(e){
                e.rotate(-45);
             }, 200, el);
            //alert(el.attr("fill"));
            var id = el.attr("id");
            var border = paper.getByDomId(id +  "_border");
            border = border ? border : paper.getByDomId(id.replace("center", "border"));
            id = id.replace("hole_", "").replace("center_", "");

            //ACTUATORs
            var borrar = false;
            function actuatorDelete(id){
                //borrar = actuators[index].act.remove();
                var indexActuator = _JSduino_.utils.getIndexActuatorById(id);
                var indexPin = _JSduino_.utils.getIndexPinById(id);
                borrar = actuators[indexActuator].act.remove();
                //borrar = borrar && pines[indexPin].pin.remove();
                /*if(borrar){
                    //actuators[indexActuator].act = null; 
                    //_JSduino_.utils.cleanActuators();
                    //pines[indexPin].pin.remove();
                    //pines[indexPin].pin = null;
                    //_JSduino_.utils.cleanPines();
                }*/
            }
            //EXISTS ?
            var index = _JSduino_.utils.hasActuator(id);
            if(index !== false){
                actuatorDelete(id);
                return null;
            }

            //CREAR
            if(!borrar && _JSduino_.deviceSel) {
                //var typeDevice = (device.value == "led") ? (device.value + deviceColor.value) : device.value;
                /*var mode = "DIGITAL", type = "INPUT";*/
                var deviceData = _JSduino_.utils.getDeviceByData(_JSduino_.deviceSel);
                var modesDevices = deviceData ? deviceData.modes : null;
                var modesPin = _JSduino_.Pin.getModesById(id);
                var modes = _JSduino_.utils.intersection(modesDevices, modesPin); //calcula si existen elementos coincidentes en ambos arrays
                var mode = null;
                //alert(id + " :: " + modesDevices + " >< " + modesPin + " = " + modes);
                //PREGUNTA POR EL MODO DESEADO: INPUT-OUTPUT //(como mucho las dos primeras opciones)
                if(!modes || modes.length == 0) {
                    return null;
                } else if(modes.length > 1) {
                    mode = confirm("Seleccione un MODO de los 2 posibles :: \n\n[ACEPTAR=='" + modes[0] + "', CANCELAR='" + modes[1] + "']");
                    mode = mode ? modes[0] : modes[1];
                } else if(modes.length > 0) {
                    mode = modes[0];
                }
                
                if(!mode){ return null; }
                
                _JSduino_.core.playSound("create");
                
                var deviceColor = document.getElementById("deviceColor");
                //alert(_JSduino_.deviceSel + "" + deviceColor.value + " - " + deviceColor.options[deviceColor.selectedIndex].value);
                var typeDevice = (_JSduino_.deviceSel == "led") ? (_JSduino_.deviceSel + deviceColor.value) : _JSduino_.deviceSel;
                //alert(typeDevice);
                //var pin = (id in _PINS_CREATED_) ? _PINS_CREATED_[id] : new _JSduino_.Pin(id, mode, /*family,*/ el, border);
                //si ya está asignado lo retorna, sinó, nulo
                var pin = _JSduino_.utils.getPinUsed(id);
                pin = pin ? pin : new _JSduino_.Pin(id, mode, /*family,*/ el, border);
                var act = new _JSduino_.Actuator(pin, typeDevice); //ya se encarga el propio actuador de autoregistrarse
                /*if(act.pin){
                    pines.push({id: id, pin: act.pin});
                }*/
                /*actuators.push({
                    id: id, 
                    act: new _JSduino_.Actuator(pin, typeDevice)
                });*/
            } else if(!_JSduino_.deviceSel){    //AVISO DISPOSITIVO NO SELECCIONADO
                var sounds = _JSduino_.getSounds();
                 var options = {
                    title: "NOTICE: Pin[" + id + "]",
                    body: null,
                    area: null, //un elemento puro del DOM
                    others: null, //otros elementos puros del DOM
                    closeButton: false,
                    callback: null,
                    millis: 3000, //0=sin límite para el cierre (msg)
                    modalParent: null,
                    logo: '<img src="' + _JSduino_.getLogo() + '" title="JSduino logo" alt="logo_JSduino" />',
                    sounds: {open: sounds.censurado, close: sounds.error1}
                };
                _JSduino_.ui.makeModalAreas("¡Seleccionar primero un dispositivo a utilizar.!", options);
                //console.log("JSduino::Raphael-> Pin[" + id + "] :: ¡Seleccionar primero un dispositivo a utilizar.!");
                return;
            }
            var lastActuator = actuators[actuators.length-1];
            if(lastActuator && !lastActuator.act.created){ actuatorDelete(id); }
        }
        
        /** Escanea los leds de la placa arduino y los almacena en arrays como elementos raphael, también construye y almacena los 'ledders' 
          * correspondientes, que son una clase que proporciona efectos de encendido, apagado y parpadeo específica para los LEDs. */
        function scanLeds(){
            //LED_ON
            var ledOn =  paper.getByDomId("led_on_body_main");
            leds.push({id: "ledOn", el: ledOn});
            var ledderOn = new _JSduino_.effects.LEDer(paper, "led_on", {main: {"fill": "red"}, mask: {"fill": "orange"}}, {color: "orangeRed"});//.on();
            ledders.push({id: "ledOn", el: ledOn, ledder: ledderOn});
            //LED_L
            var ledLoad =  paper.getByDomId("led_load_body_main");
            leds.push({id: "ledLoad", el: ledLoad});
            var glowLedLoad = new _JSduino_.effects.Glower(ledLoad, {color: "yellow"});
            glows.push({id: "ledLoad", el: ledLoad, glow: glowLedLoad});
            //glowLedLoad.blink(4, 150, false);
            var ledderLoad = new _JSduino_.effects.LEDer(paper, "led_load", {main: {"fill": "orange"}, mask: {"fill": "yellow"}}, {color: "orange"});//.blink(4, 350, false);
            ledders.push({id: "ledLoad", el: ledLoad, ledder: ledderLoad});
            //LED_RX
            var ledRx = paper.getByDomId("led_rx_body_main");
            leds.push({id: "ledRx", el: ledRx});
            var ledderRx = new _JSduino_.effects.LEDer(paper, "led_rx", {main: {"fill": "dodgerBlue"}, mask: {"fill": "lightBlue"}}, {color: "lavender"});//.blink(3, 150, false);
            ledders.push({id: "ledRx", el: ledRx, ledder: ledderRx});
            //LED_TX
            var ledTx = paper.getByDomId("led_tx_body_main");
            leds.push({id: "ledTx", el: ledTx});
            var ledderTx = new _JSduino_.effects.LEDer(paper, "led_tx", {main: {"fill": "limeGreen"}, mask: {"fill": "lightGreen"}}, {color: "greenYellow"});//.blink(3, 250, false);
            ledders.push({id: "ledTx", el: ledTx, ledder: ledderTx});
        }
        
        function scanButtons(){
            //RESET
            //var btnResetButton = paper.getByDomId("btnReset_body_button");
            var btnReset = paper.getByDomId("btnReset_body_button");
            actions.push({id: "btnReset", el: btnReset});
            //var glowReset = new _JSduino_.effects.Glower(btnResetButton, {color: "orangeRed"});
            var glowReset = new _JSduino_.effects.Glower(btnReset, {color: "orangeRed"});
            glows.push({id: "btnReset", el: btnReset, glow: glowReset});
            //var glowLedOn = new _JSduino_.effects.Glower(ledOn, {color: "orangeRed"});
            //glowLedOn.on();
            if(!btnReset){ 
                console.log("ERROR:: algún problema en RAPHAEL");
                return;
            }
            btnReset/*_JSduino_.utils.getActionById("btnReset");*/
                .attr({"cursor": "pointer"})
                .data({"power": true})
                .hover(function(ev){
                        _JSduino_.core.playSound("show");
                        glowReset.on();
                    }, function(ev){
                        _JSduino_.core.playSound("hide");
                        glowReset.off();
                })
                .mousedown(function(ev){
                    //_JSduino_.utils.getLedderById("ledOn").off();
                    this.data({"reset": true});
                    //TODO: TO RESET PUSH
                })
                .mouseup(function(ev){
                    //_JSduino_.utils.getLedderById("ledOn").blink(4, 150, true);
                    setTimeout(function(t){ t.data({"reset": false}); }, 1000, this);
                })
                .click(function(ev){
                    if(!this.data("power")){
                        //ledOn.attr({"fill": "yellow"});
                        //paper.getByDomId("led_on_mask").attr({"fill": "yellow"});
                        //glowLedOn.on();
                        this.data({"power": true});
                    } else {
                        this.data({"power": false});
                        //paper.getByDomId("led_on_body_main").attr({"fill": "white"});
                        //paper.getByDomId("led_on_mask").attr({"fill": "whiteSmoke"});
                        //if(glow2) { glow2.remove(); glow2 = null; }
                        //glowLedOn.off();
                    }
                    //TODO:: TO RESET PUSH
                    _JSduino_.core.reset();
                });/**/
        }
        
        function setPinsGroups(groups){
            if(!groups) { return; }
            for(var p in groups){
                if(groups.hasOwnProperty(p)){
                    pinsGroups.push({id: p, group: groups[p]});
                }
            }
        }
        
        function scan(){
            paper = eval(_JSduino_._PAPER_RAPHAEL_);
            if(!paper){ 
                throw new Error("RAPHAEL->SCAN:: Algún problema en RAPHAEL. No se puede crear el 'paper'");
                return null;
            }
            setPinsGroups(raphaelGroups); //vienen definidos en el propio archivo '*.svg.raphael.js'
            scanPins();
            scanLeds();
            scanButtons();
        }
        
        //PUBLIC API:
        return {
            scan: scan,
            getPaper: function(){ return paper; }
        };
    })();
    //END MODULE: JSduino.raphael
    
    //BEGIN MODULE CLASS: JSduino.Actuator
    _JSduino_.Actuator = (function(){
        "use strict";
        
        //CONSTANTES / ENUMS:
        //OBJETO QUE DEFINE LOS TYPOS DE ACTUADORES A UTILIZAR
        /* Son atributos de objetos javascript que deben corresponderse más o menos fielmente con la constante 
         * definida en 'JSduino' :: 'objDevices', aunque estos últimos se refieran a objetos DOMElements; donde
         * 'name' se correspondería con 'data', y 'imgs' con 'src' más o menos. */
        var actuatorTypes = {
            "switcher": {
                types: [],
                modes: ["INPUT", "OUTPUT"],
                imgs: ["API/images/actuators/switcher_v_off.png", "API/images/actuators/switcher_v_on.png"],
                name: "switcher",
                states: ["LOW", "HIGH"],
                values: [0, 1],
                colors: ["red", "lime"] //para el pin asociado
            },
            "buttonNO": {
                types: [],
                modes: ["INPUT", "OUTPUT"],
                imgs: ["API/images/actuators/button_v_off.png", "API/images/actuators/button_v_on.png"],
                name: "button NO",
                states: ["LOW", "HIGH"],
                values: [0, 1],
                colors: ["red", "lime"]
            },
            "buttonNC": {
                types: [],
                modes: ["INPUT", "OUTPUT"],
                imgs: ["API/images/actuators/button_v_on.png", "API/images/actuators/button_v_off.png"],
                name: "button NC",
                states: ["HIGH", "LOW"],
                values: [1, 0],
                colors: ["lime", "red"]
            },
            "sensor": {
                types: [],
                modes: ["INPUT", "OUTPUT"],
                imgs: ["API/images/actuators/lineal_min.png", "API/images/actuators/lineal_1.png", "API/images/actuators/lineal_2.png", "API/images/actuators/lineal_3.png", 
                       "API/images/actuators/lineal_4.png", "API/images/actuators/lineal_5.png", "API/images/actuators/lineal_6.png", "API/images/actuators/lineal_7.png", 
                       "API/images/actuators/lineal_8.png", "API/images/actuators/lineal_9.png", "API/images/actuators/lineal_max.png", "API/images/actuators/lineal_sat.png"],
                name: "sensor",
                states: ["LOW", "LOW1", "LOW2", "LOW3", "LOW4", "MIDDLE", "HIGH1", "HIGH2", "HIGH3", "HIGH4", "HIGH", "*"], //* = sobrecargado
                values: [0.0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1, 1.1],
                colors: ["red", "tomato", "orange", "violet", "slateBlue", "steelBlue", "green", "MediumSeaGreen", "olive", "lightGreen", "lime", "coral"]
            },
            "ledRed": {
                types: [],
                modes: ["OUTPUT"],
                imgs: ["API/images/actuators/led_red.png", "API/images/actuators/led_red_on.png"],
                name: "led red",
                states: ["OFF", "ON"],
                values: [0, 1],
                colors: ["red", "lime"]
            },
            "ledGreen": {
                types: [],
                modes: ["OUTPUT"],
                imgs: ["API/images/actuators/led_green.png", "API/images/actuators/led_green_on.png"],
                name: "led green",
                states: ["OFF", "ON"],
                values: [0, 1],
                colors: ["red", "lime"]
            },
            "ledBlue": {
                types: [],
                modes: ["OUTPUT"],
                imgs: ["API/images/actuators/led_blue.png", "API/images/actuators/led_blue_on.png"],
                name: "led blue",
                states: ["OFF", "ON"],
                values: [0, 1],
                colors: ["red", "lime"]
            },
            "ledOrange": {
                types: [],
                modes: ["OUTPUT"],
                imgs: ["API/images/actuators/led_orange.png", "API/images/actuators/led_orange_on.png"],
                name: "led orange",
                states: ["OFF", "ON"],
                values: [0, 1],
                colors: ["red", "lime"]
            },
            "ledYellow": {
                types: [],
                modes: ["OUTPUT"],
                imgs: ["API/images/actuators/led_yellow.png", "API/images/actuators/led_yellow_on.png"],
                name: "led yellow",
                states: ["OFF", "ON"],
                values: [0, 1],
                colors: ["red", "lime"]
            },
            "ledWhite": {
                types: [],
                modes: ["OUTPUT"],
                imgs: ["API/images/actuators/led_white.png", "API/images/actuators/led_white_on.png"],
                name: "led white",
                states: ["OFF", "ON"],
                values: [0, 1],
                colors: ["red", "lime"]
            },
            "display": {  //5 rows x 12-13 characters (60-64 characters max.)
                types: [],
                modes: ["OUTPUT"],
                imgs: ["API/images/actuators/display_off.png", "API/images/actuators/display_on.png"],
                name: "display",
                states: ["OFF", "ON"],
                values: [0, 1],
                colors: ["tomato", "slateBlue"]
            }
        };
        
        /** CONSTRUCTOR:: */
        function Actuator(pin, type){
            /*this.type, this.pinUsed, this.pin, this.name.this.inputName, this.className, this.container, this.structure;
            this.img, this.text, this.info, this.value, this.state, this.color, this.fillOriginal, this.borderOriginal;
            this.glowPin, this.pinsSuscrite, this.created;*/
            if(pin){ init(this, pin, type); }
        }
        
        function init(act, pin, type){
            act.actuatorType = type ? type : "switcher";
            act.type = actuatorTypes[act.actuatorType];
            //si ya está asignado lo retorna, sinó, nulo
            var pinUsed = _JSduino_.utils.getPinCompatible(pin.id, act.type.modes);
            act.pin = pinUsed ? pinUsed : pin;
            act.name = "";
            act.inputName = null;
            act.className = "actuator";
            act.container = _JSduino_.ui.containers.Actuators; //document.getElementById("actuators");
            act.structure = null; //HTML creado
            act.img = null;
            act.text = "";
            act.info = null;
            act.value = act.type.values[0];
            act.state = act.type.states[0];
            act.color = act.type.colors[0];
            act.fillOriginal = act.pin.er ? act.pin.er.attr("fill") : null;
            act.borderOriginal = act.pin.br ? act.pin.br.attr("fill") : null;
            act.glowPin = act.pin.glow ? act.pin.glow : null;
            //act.glow = null;
            act.pinsSuscrite = [];
            act.created = false;
            addActuator(act);
        }
        
        function addActuator(act){
            if(!act.pin.er /*|| !(act.created = confirm("¿ Confirma crear el Actuador ?"))*/){ return null; }
            act.structure = makeStructure(act);
            act.container.insertBefore(act.structure, act.container.lastChild);
            //act.container.appendChild(act.structure);
            _JSduino_.getActuators().push({id: act.pin.id, act: act});
            act.created = true;
            act.suscribe(act.pin);
        }
        
        function makeStructure(act){
            var id = act.pin.er.attr("id");
            var li = document.createElement("li");
            li.className = act.className + " act-" + act.pin.mode; //"actuator";
            li.id = "li_" + id;
            /*li.addEventListener("mouseover", function(ev){
                act.highlight(true);
                //act.er.attr({"fill": "yellow"});
                //if(!act.glowPin) { act.glowPin = act.pin.er.glow({color: "yellow"}); }
            });*/
            _JSduino_.events.setListener(li, "mouseover",  function (ev){ 
                _JSduino_.core.playSound("pase"); 
                act.highlight(true);
            });
            /*li.addEventListener("mouseleave", function(ev){
                act.highlight(false);
                //if(act.glowPin) { act.glowPin.remove(); act.glowPin = null; }
            });*/
            _JSduino_.events.setListener(li, "mouseleave",  function (ev){ act.highlight(false); });
            var imgBtn = imgByType(act);
            /*
            imgBtn.addEventListener("onload", function(ev){
                console.log("::IMG LOADED::");
            });*/
            li.appendChild(imgBtn);
            if(act.type.name != "display"){
                var br1 = document.createElement("br");
                li.appendChild(br1);
            }
            act.inputName = document.createElement("input");
            act.inputName.className = "nameLi";
            /*act.inputName.style.fontSize = "x-small";
            act.inputName.style.width = "50px";*/
            act.inputName.value = "";
            act.inputName.placeholder = "Name";
            /*act.inputName.addEventListener("change", function(ev){
                act.name = ev.target.value;
                act.text = ev.target.value;
            });*/
            //_JSduino_.events.setListener(act, "change",  function (ev){
            _JSduino_.events.setListener(act.inputName, "change",  function (ev){
                _JSduino_.core.playSound("light3");
                act.name = ev.target.value;
                act.text = ev.target.value;
            });
            li.appendChild(act.inputName);
            /*var divSettings = document.createElement("div");
            divSettings.className = "settings";
            divSettings.style.fontSize = "x-small";
            act.info = divSettings;
            */
            //infoUpdate(act);
            //li.appendChild(divSettings);
            
            infoUpdate(act);
            
            return li;
        }
        
        function updateImg(act, index){
            //FORZAR EL PARPADEO DE LA IMÁGEN
            /*
            act.img.style.display = "none";
            setTimeout(
                function(act, index){
                    //act.img.src = act.type.imgs[index];
                    act.img.style.display = "block";
                }, 
                1, 
                act, 
                index
            );*/
            //console.log("-->UPDATED IMG<-- :: " + act.img.src);
        }
        
        function infoUpdate(act){
            var index = getIndex(act);
            act.state = act.type.states[index];
            act.color = act.type.colors[index];
            var info = [];
            info.push("Name: " + act.name);
            info.push("Type: " + act.type.name);
            info.push("Pin: " + act.pin.id);
            info.push("State: " + act.state + " [from: " + act.type.states + "]");
            info.push("Value: " + act.value + " [from: " + act.type.values + "]");
            act.info = info;
            //info = info.join("\n");
            if(act.img){
                act.img.src = act.type.imgs[index];
                act.img.title = "States: " + act.type.states + "\nValues: " + act.type.values;
                act.img.title =  info.join("\n");
                /*
                //ACCIONES PARA FORZAR UN REFRESCO EN LA IMÁGEN SI EL CAMBIO DE VALORES ES DEMASIADO RÁPIDO
                act.img.style.display = "none";
                //act.img.src = "none.jpg";
                //act.img.style.position = "absolute";
                //var n = (parseInt(act.img.style.left));
                //n = isNaN(n) ? 0 : n;
                //alert(act.img.style.left + "::" + n);
                //act.img.style.left = (10 + n) + "px";
                //act.img.src = act.type.imgs[index];
                setTimeout(
                    function(act, index){ 
                        act.img.style.display = "block"; 
                        act.img.src = act.type.imgs[index];
                        setTimeout(function(){ act.img.src = act.type.imgs[index]; }, 4, act, index);
                    }, 
                    1, 
                    act, 
                    index
                );
                */
                //setTimeout(updateImg, 20, act, index);
                updateImg(act, index);
            }
            //act.info.innerHTML = info.join("<br />\n");//act.type.name + "<br />Pin: '" + /*act.pin.er.attr("id")*/ act.pin.id + "'<br />State: " + act.state + ", Value: " + act.value;
            //if(act.pin.br) { act.pin.br.attr({"fill": act.color}); } //TODO: Debería actualizarse su estado desde el propio Pin
        }
        
        function getValueByIndex(act, index){
            var value = null;
            for(var i=0; i<act.type.values.length; i++){
                if(index == i){ value = act.type.values[i]; }
            }
            return value;
        }
        
        function getIndexByValue(act, value){
            var index = 0;
            for(var i=0; i<act.type.values.length; i++){
                if(value == act.type.values[i]){ index = i; }
            }
            return index;
        }
        
        function getIndex(act){
            var index = 0;
            for(var i=0; i<act.type.values.length; i++){
                if(act.value == act.type.values[i]){ index = i; }
            }
            return index;
        }
        
        function nextIndex(act){
            var currentIndex = getIndex(act);
            return (currentIndex == (act.type.values.length-1)) ? 0 : (++currentIndex);
        }
        

        function enableDisplay(act){ //DISPLAY
            act.value = act.type.values[1]; //act.type.values[nextIndex(act)];
            infoUpdate(act);
            
            setTimeout(function(){
                act.value = act.type.values[0];
                infoUpdate(act);
            }, 4000);
        }
        
        function imgByType(act){
            var imgBtn = document.createElement("img");
            act.img = imgBtn;
            //act.img.addEventListener("onload", function(){ console.log("imgBtn changed"); });
            //act.img.addEventListener("oncomplete", function(){ console.log("imgBtn completed"); });
            imgBtn.src = act.type.imgs[0];
            /*imgBtn.style.width = "50%";
            imgBtn.style.height = "40%";
            imgBtn.style.cursor = "pointer";
            imgBtn.style.margin = "auto";*/
            //imgBtn.title = "States: " + act.type.states + "\nValues: " + act.type.values;
            //imgBtn.setAttribute("data", "LOW");
            
            function handlerEvents1(ev){
                if(act.type.name == "display"){  //DISPLAY ONLY
                    enableDisplay(act);
                    return;
                }
                
                _JSduino_.core.playSound((ev.type == "mousedown") ? "clickOn" : "clickOff");
                act.value = act.type.values[nextIndex(act)];
                infoUpdate(act);
                act.notify(act.value);
            }
        
            switch(act.type.name){
                case "button NO": case "button NC":
                    //imgBtn.addEventListener("mouseup", handlerEvents1);
                    _JSduino_.events.setListener(imgBtn, "mouseup",  handlerEvents1);
                    //imgBtn.addEventListener("mousedown", handlerEvents1);
                    _JSduino_.events.setListener(imgBtn, "mousedown",  handlerEvents1);
                    
                    break;
                case "led": //, "led white", "led red", "led green", "led blue", "led orange", "led yellow"
                    //A TRAVÉS DE NOTIFY
                    break;
                case "display": //5 rows x 12-13 characters (60-64 characters max.)
                    imgBtn.style.width = "100%";
                    imgBtn.style.height = "100%";
                    var divDisplay = document.createElement("div");
                    divDisplay.style.margin = "auto";
                    divDisplay.style.padding = "0";
                    divDisplay.style.width = "99%";
                    divDisplay.style.height = "70%";
                    divDisplay.appendChild(imgBtn);
                    var br1 = document.createElement("br");
                    divDisplay.appendChild(br1);
                    act.txtDisplay = document.createElement("textarea");
                    //txtDisplay.style.display = "none";
                    act.txtDisplay.style.position = "absolute";
                    act.txtDisplay.style.width = "98%";
                    act.txtDisplay.style.height = "65%";
                    act.txtDisplay.style.left = "0";
                    act.txtDisplay.style.top = "0";
                    act.txtDisplay.style.fontSize = "x-small";
                    act.txtDisplay.style.color = "#333333";
                    act.txtDisplay.style.background = "transparent";
                    act.txtDisplay.style.border = "none";
                    act.txtDisplay.style.boxShadow = "none";
                    act.txtDisplay.enabled = false;
                    act.txtDisplay.style.overflow = "hidden";
                    //act.txtDisplay.addEventListener("change", handlerEvents1);
                    _JSduino_.events.setListener(act.txtDisplay, "change",  handlerEvents1);
                    divDisplay.appendChild(act.txtDisplay);
                    return divDisplay;
                case "sensor":
                case "switcher":
                default:
                    //imgBtn.addEventListener("click", handlerEvents1);
                    _JSduino_.events.setListener(imgBtn, "click",  handlerEvents1);
            }
            
            
            return imgBtn;
        }
        
        /**/
        Actuator.prototype.update = function (value){
            var resultado = null;
            //SOLO PERMITE ACTUAR SOBRE LOS SIGUIENTES TIPOS (de salida):
            //var notifieds = ["switcher", "pulse", "button", "button NO", "button NC", "sensor", "led", "led white", "led red", "led green", "led blue", "led orange", "led yellow", "display"];
            //if(notifieds.indexOf(this.type.name) > -1){
                if(this.type.name == "display"){
                    this.txtDisplay.value = value;
                    //this.text = value;
                    enableDisplay(this);
                } else {
                    var v = getValueByIndex(this, getIndexByValue(this, value)); //filtra los valores pasados
                    if(v == null) { 
                        console.log("Actuator->update() ERROR: Este valor (" + value + ") no tiene representación en el array de valores [" + this.type.values + "]");
                        return resultado;
                    }
                    this.value = v;
                }
                infoUpdate(this);
                resultado = true;
            //}
            return resultado;
        }
        
        Actuator.prototype.notify = function (value){
            var resultado = null;
            if(resultado = this.update(value)){
                for(var i=0; i<this.pinsSuscrite.length; i++){
                    var pin = this.pinsSuscrite[i];
                    //if(this.type.name == "sensor") { value /= 10;}
                    pin.update(value);
                }
            }
            return resultado;
        }
        Actuator.prototype.suscribe = function (pin){
            if(!pin || !(pin instanceof _JSduino_.Pin)) { return null; }
            if(this.pinsSuscrite.indexOf(pin) < 0) {
                this.pinsSuscrite.push(pin);
                for(var i=0; i<this.pinsSuscrite.length; i++){
                    var pin = this.pinsSuscrite[i];
                    pin.notify(this.value);
                }
                infoUpdate(this);
                pin.suscribe(this);
            }
        }
        Actuator.prototype.unSuscribe = function (pin){
            if(!pin || !(pin instanceof _JSduino_.Pin)) { return null; }
            if(this.pinsSuscrite.indexOf(pin) > -1) {
                this.pinsSuscrite.splice(this.pinsSuscrite.indexOf(pin), 1);
                for(var i=0; i<this.pinsSuscrite.length; i++){
                    var pin = this.pinsSuscrite[i];
                    pin.notify(this.value);
                }
                infoUpdate(this);
                pin.unSuscribe(this);
            }
        }
        
        Actuator.prototype.getPinSuscriteById = function (id){
            for(var i=0; i<this.pinsSuscrite.length; i++){
                var pin = this.pinsSuscrite[i];
                if(pin.id == id) { return pin; }
            }
            return null;
        }
        
        Actuator.prototype.remove = function () {
            var borrar = confirm("¿ Seguro que desea quitar el Actuador que gobierna a este Pin?");
            if(!borrar || !this.pin){ return false; }
            _JSduino_.core.playSound("remove");
            this.pin.highlight(false);
            if(this.container && this.structure){ this.container.removeChild(this.structure); }
            this.structure = null;
            this.unSuscribe(this.pin);
            var acts = _JSduino_.getActuators();
            if(acts.indexOf(this)) { acts.splice(_JSduino_.utils.getIndexActuatorById(this.pin.id), 1); }
            this.pin.remove();
            return borrar;
        }
        Actuator.prototype.highlight = function (onOff) {
            if(this.structure){
                this.structure.style.opacity = onOff ? "1" : "0.75";
                this.structure.style.borderWidth = onOff ? "2px" : "2px";
                this.structure.style.borderColor = onOff ? "yellow" : "steelBlue";
            }
            this.pin.highlight(onOff);
        }
        
        /** ATENCIÓN: Al establecer un nuevo Pin, se renueva todo el actuador, se borra todos los anteriores 
          * atributos y la estructura creada y vuelve a recrearse con los nuevos valores*/
        Actuator.prototype.setPin = function (pin, type) {
            if(this.pin){ this.remove(); }
            init(this, pin, type);
        }
        
        /** Guarda este actuador como un objeto de guardado especial compatible con el tipo 'objectActuators' que 
          * debe tener una estructura muy definida tal que así: 
        objectActuators = 
        {
          INPUT:{ //UL ACTUADORES (INPUT, OUTPUT, LEVEL)
                    id:        "buttonsInput",
                    caption:   "ENTRADAS:<br />",
                    className: "actuators input",
                    list: [   //lis
                            { //li actuator
                                type:      "switcher", //switcher, pulse, button, buttonNO, buttonNC, sensor, led, ledWhite, ledRed, ...
                                family:    "DIGITAL",  //DIGITAL, ANALOG, POWER, AVR, SERIAL, SPI, I2C, PWM, INTERRUPT
                                id:        "8",        //"hole_8",
                                txt:       "AC-DC",
                                value:     1,
                                className: "actuator"
                            },
                            {...}
                          ]
                },
           ...
        }
        */
        Actuator.prototype.toSaveObj = function () {
            return {
                type: this.actuatorType,
                mode: this.pin.mode,
                family: this.pin.familys[0],
                id: this.pin.id,
                txt: this.text,
                value: this.pin.value,
                className: 'actuator'
            };
        }
        /** OVERRIDE:: Sobreescribe el método genérico para ofrecer una cadena compatible con el objeto tipo 'objectActuators'  */
        Actuator.prototype.toString = function (){
            return JSON.stringify(this.toSaveObj());
        }
        
        return Actuator;
    })();
    //END MODULE CLASS:: JSduino.Actuator
        
    //BEGIN MODULE: JSduino.Pin
    /* Class 'Pin' dentro del namespace 'JSduino'.
     * Crea un objeto Pin */
    _JSduino_.Pin = (function (){
        //CONSTANTES DE PINES
        /** Define los pines por su id y sus sinónimos. De todas formas se encuentran 
          * indexados del 0 al 31 (31 pines en total) en el array, aunque no tiene porqué 
          * corresponderse este 'index' con su número de pin en la placa, de echo sólo 
          * concuerdan del 0 al 13.
          * Un par de pines se encuentran SEMI-REPETIDOS (A4-SDA y A5-SCL) y otro no tiene 
          * conexión ni utilidad alguna (NA) porque se encuentra SIN-ASIGNAR. */
        var _PINS_DEF_ = [
            {id: "0", aka: ["PD0", "RX", "0_RX0"], values: [0, 1], states: ["LOW", "HIGH"], modes: ["INPUT", "OUTPUT"]},              //0
            {id: "1", aka: ["PD1", "TX", "1_TX0"], values: [0, 1], states: ["LOW", "HIGH"], modes: ["INPUT", "OUTPUT"]},              //1
            {id: "2", aka: ["PD2", "INT0"], values: [0, 1], states: ["LOW", "HIGH"], modes: ["INPUT", "OUTPUT"]},            //2
            {id: "3", aka: ["PD3", "INT1"], values: [0, 1], states: ["LOW", "HIGH"], modes: ["INPUT", "OUTPUT"]},            //3
            {id: "4", aka: ["PD4"], values: [0, 1], states: ["LOW", "HIGH"], modes: ["INPUT", "OUTPUT"]},                    //4
            {id: "5", aka: ["PD5"], values: [0, 1], states: ["LOW", "HIGH"], modes: ["INPUT", "OUTPUT"]},                    //5
            {id: "6", aka: ["PD6"], values: [0, 1], states: ["LOW", "HIGH"], modes: ["INPUT", "OUTPUT"]},                    //6
            {id: "7", aka: ["PD7"], values: [0, 1], states: ["LOW", "HIGH"], modes: ["INPUT", "OUTPUT"]},                    //7
            {id: "8", aka: ["PB0"], values: [0, 1], states: ["LOW", "HIGH"], modes: ["INPUT", "OUTPUT"]},                    //8
            {id: "9", aka: ["PB1"], values: [0, 1], states: ["LOW", "HIGH"], modes: ["INPUT", "OUTPUT"]},                    //9
            {id: "10", aka: ["PB2", "SS"], values: [0, 1], states: ["LOW", "HIGH"], modes: ["INPUT", "OUTPUT"]},             //10
            {id: "11", aka: ["PB3", "MOSI"], values: [0, 1], states: ["LOW", "HIGH"], modes: ["INPUT", "OUTPUT"]},           //11
            {id: "12", aka: ["PB4", "MISO"], values: [0, 1], states: ["LOW", "HIGH"], modes: ["INPUT", "OUTPUT"]},           //12
            {id: "13", aka: ["PB6", "SCK"], values: [0, 1], states: ["LOW", "HIGH"], modes: ["INPUT", "OUTPUT"]},            //13
            {id: "GND3", aka: ["14_GND_3"], values: [0], states: ["LOW"], modes: ["LEVELS"]},                                 //14
            {id: "AREF", aka: ["15_AREF"], values: [0.1], states: ["*"], modes: ["INPUT", "LEVELS"]},                                 //15 //CUALQUIER VALOR
            {id: "SDA", aka: ["18", "PC41", "A42", "16_SDA"], values: [0.1], states: ["*"], modes: ["INPUT", "OUTPUT"]},               //16
            {id: "SCL", aka: ["19", "PC51", "A52", "17_SCL"], values: [0.1], states: ["*"], modes: ["INPUT", "OUTPUT"]},               //17
            {id: "A0", aka: ["14", "PC0"], values: [0.0,.1,.2,.3,.4,.5,.6,.7,.8,.9, 1, 1.1], states: ["LOW", "LOW1", "LOW2", "LOW3", "LOW4", "MIDDLE", "HIGH1", "HIGH2", "HIGH3", "HIGH4", "HIGH", "*"], modes: ["INPUT"]},                        //18 //0-1023
            {id: "A1", aka: ["15", "PC1"], values: [0.0,.1,.2,.3,.4,.5,.6,.7,.8,.9, 1, 1.1], states: ["LOW", "LOW1", "LOW2", "LOW3", "LOW4", "MIDDLE", "HIGH1", "HIGH2", "HIGH3", "HIGH4", "HIGH", "*"], modes: ["INPUT"]},                        //19 //0-1023
            {id: "A2", aka: ["16", "PC2"], values: [0.0,.1,.2,.3,.4,.5,.6,.7,.8,.9, 1, 1.1], states: ["LOW", "LOW1", "LOW2", "LOW3", "LOW4", "MIDDLE", "HIGH1", "HIGH2", "HIGH3", "HIGH4", "HIGH", "*"], modes: ["INPUT"]},                        //20 //0-1023
            {id: "A3", aka: ["17", "PC3"], values: [0.0,.1,.2,.3,.4,.5,.6,.7,.8,.9, 1, 1.1], states: ["LOW", "LOW1", "LOW2", "LOW3", "LOW4", "MIDDLE", "HIGH1", "HIGH2", "HIGH3", "HIGH4", "HIGH", "*"], modes: ["INPUT"]},                        //21 //0-1023
            {id: "A4", aka: ["18", "PC4", "SDA2"], values: [0.0,.1,.2,.3,.4,.5,.6,.7,.8,.9, 1, 1.1], states: ["LOW", "LOW1", "LOW2", "LOW3", "LOW4", "MIDDLE", "HIGH1", "HIGH2", "HIGH3", "HIGH4", "HIGH", "*"], modes: ["INPUT"]},                //22 //0-1023
            {id: "A5", aka: ["19", "PC5", "SCL2"], values: [0.0,.1,.2,.3,.4,.5,.6,.7,.8,.9, 1, 1.1], states: ["LOW", "LOW1", "LOW2", "LOW3", "LOW4", "MIDDLE", "HIGH1", "HIGH2", "HIGH3", "HIGH4", "HIGH", "*"], modes: ["INPUT"]},                //23 //0-1023
            {id: "VIN", aka: [], values: [1], states: ["HIGH"], modes: ["INPUT", "LEVELS"]},                                 //24
            {id: "GND1", aka: [], values: [0], states: ["LOW"], modes: ["LEVELS"]},                                 //25
            {id: "GND2", aka: [], values: [0], states: ["LOW"], modes: ["LEVELS"]},                                 //26
            {id: "5V", aka: [], values: [5], states: ["HIGH"], modes: ["OUTPUT", "LEVELS"]},                                  //27
            {id: "3V3", aka: [], values: [3.3], states: ["HIGH"], modes: ["OUTPUT", "LEVELS"]},                               //28
            {id: "RESET", aka: ["PC6", "RESET_2"], values: [0, 1], states: ["LOW", "HIGH"], modes: ["INPUT"]},                //29
            {id: "IOREF", aka: [], values: [0.1], states: ["*"], modes: ["INPUT", "LEVELS"]},                                //30 //CUALQUIER VALOR
            {id: "NA", aka: [], values: [], states: [], modes: []}                                          //31
        ];
        
        //["0","1","2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "SDA", "SCL", "A0", "A1", "A2", "A3", "A4", "A5"];
        var _PINS_INPUT_ = (function (){
            var arr = [];
            var saltar = [14, 15];
            for(var i=0; i<24; i++){ 
                if(saltar.indexOf(i) == -1) { arr.push(_PINS_DEF_[i]); }
            }
            return arr;
        })();
        //["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "SDA", "SCL"];
        var _PINS_OUTPUT_ = (function (){
            var arr = [];
            var saltar = [14, 15];
            for(var i=0; i<18; i++){ 
                if(saltar.indexOf(i) == -1) { arr.push(_PINS_DEF_[i]); }
            }
            return arr;
        })();
        //["Vin", "GND1", "GND2", "5v", "3v3", "RESET1", "IOREF", "AREF", "GND3"];
        var _PINS_POWER_ = (function (){
            var arr = [];
            for(var i=24; i<(_PINS_DEF_.length-1); i++){ 
                arr.push(_PINS_DEF_[i]);
            }
            arr.push(_PINS_DEF_[15]);
            arr.push(_PINS_DEF_[14]);
            return arr;
        })();
        /*var _PIN_FAMILY_ = ["DIGITAL", "ANALOG", "AVR", "POWER", "SERIAL", "SPI", "I2C", "PWM", "INTERRUPT"];
        var _PIN_MODES_ = ["INPUT", "OUTPUT", "LEVELS"];*/
        var _PIN_MODES_ = {
                            "INPUT": _PINS_INPUT_,
                            "OUTPUT": _PINS_OUTPUT_,
                            "LEVELS": _PINS_POWER_
        };
        var _PIN_FAMILY_ = { 
                            "DIGITAL": _PIN_MODES_.OUTPUT, 
                            "ANALOG": _JSduino_.utils.diferenciation(_PIN_MODES_.INPUT, _PIN_MODES_.OUTPUT), 
                            "AVR": _PIN_MODES_.INPUT.concat([_PINS_DEF_[29]/*RESET*/]),
                            "POWER": _PIN_MODES_.LEVELS, 
                            "SERIAL": [_PINS_DEF_[0], _PINS_DEF_[1]], 
                            "SPI": [_PINS_DEF_[10], _PINS_DEF_[11], _PINS_DEF_[12], _PINS_DEF_[13]], 
                            "I2C": [_PINS_DEF_[16]/*SDA*/, _PINS_DEF_[17]/*SCL*/], 
                            "PWM": [_PINS_DEF_[3], _PINS_DEF_[5], _PINS_DEF_[6], _PINS_DEF_[9], _PINS_DEF_[10], _PINS_DEF_[11]], 
                            "INTERRUPT": [_PINS_DEF_[2], _PINS_DEF_[3]]
        };
        //COLORES SEGÚN EL ESTADO
        var _COLORS_DEFAULT_ = {
                "LOW": "red", "LOW1": "tomato", "LOW2": "orange", "LOW3": "violet", "LOW4": "slateBlue", 
                "MIDDLE": "steelBlue",
                "HIGH1": "green", "HIGH2": "MediumSeaGreen", "HIGH3": "olive", "HIGH4": "lightGreen", "HIGH": "lime", 
                "*": "coral"
        };
        //VARIABLES
        //var actuatorsSuscrite = [{id: null, actuators: []}];
        /*var _PIN_IDS_ = [
                            "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "SDA", "SCL" //DIGITAL
                            "A0", "A1", "A2", "A3", "A4", "A5", //ANALOG
                            "Vin", "GND1", "GND2", "5v", "3v3", "RESET1", "IOREF", "AREF", "GND3" //POWER
                        ];*/
                        
        //VARIABLES DE PINES
        var defaultMode = "INPUT";
        var defaultFamily = "DIGITAL";
        var defaultId = _PINS_DEF_[0].id; //"0";
        var defaultAka = _PINS_DEF_[0].aka[0]; //"PD0";
        var defaultValue = _PINS_DEF_[0].values[0]; //0;
        var defaultState = _PINS_DEF_[0].states[0]; //"LOW";
        var defaultObj = null;
        //registro de eventos, para poder des-atacarlos
        var evs = {
            "click" : [],
            "dblclick" : [],
            "keydown" : [],
            "keyup" : [],
            "keypress" : [],
            "mousedown" : [],
            "mouseup" : [],
            "mousemove" : [],
            "mouseenter" : [],
            "mouseout" : [],
            "mouseleave" : []
        };
        /** CONSTRUCTOR:: el parámetro strict se utiliza para imposibilitar el asignar un modo o tipo por defecto. 
          * @param id {number/string} El identificador o 'aka' como el establecido en 'PIN_DEF'.
          * @param mode {string} Un tipo como los establecidos en '_PIN_MODES_'.
          * @param <del>family {string} Una familia como los establecidos en '_PIN_FAMILY_'.</del>
          * @param elRaphael {Raphael Object} [OPTIONAL] Objeto Raphael al que representa este pin. Puede tomarse automáticamente. 
          * @param borderRaphael {Raphael Object} [OPTIONAL] Objeto Raphael que representa el borde de este pin. Puede tomarse automáticamente. 
          * @param strict {boolean} Especifica si no se deben permitir modos y tipos por defecto. En caso afirmativo fuerza una falla en el constructor. */
        function Pin(id, mode, /*family,*/ elRaphael, borderRaphael, strict){
            this.error = true;
            this.strict = strict;
            
            id = filtraId((id + "").toUpperCase(), defaultId); //setId(id);
            this.pinDef = Pin.getPinDefById(id);
            this.actuatorsSuscrite = [];
            this.evs = evs;
            //OBJETOS RAPHAEL
            this.er = elRaphael;
            if(!this.er){ this.er = _JSduino_.raphael.getPaper().getByDomId("hole_"+id); }
            this.br = borderRaphael;
            if(this.er && !this.br){ this.br = _JSduino_.raphael.getPaper().getByDomId("hole_"+id+"_border"); }
            this.obj = this.er;
            
            if(!id){
                console.log("Pin:: Error al crear el pin [" + id + "]. No puede utilizarse este ID.");
                return null;
            } 
            this.id = this.pinDef.id;
            var modes = Pin.getModesById(this.id);
            mode = filtraMode((mode + "").toUpperCase(), modes, defaultMode);
            if(!mode){
                if(strict) {
                    console.log("Pin:: Error al crear el pin [" + this.id + "] == '" + this.pinDef.aka + "'. No puede utilizarse el MODO = '" + mode + "'");
                    return null;
                } 
                mode = modes[0];
            }
            this.mode = mode;
            
            this.familys = Pin.getFamilysByIdAndMode(this.id, this.mode);

            this.name = "";
            //this.container = document.getElementById("actuators");
            //this.structure = null; //HTML creado
            //this.img = null;
            this.text = "";
            this.info = null;
            this.value = this.pinDef.values[0];
            this.state = this.pinDef.states[0];
            //this.color = this.type.colors[0];
            this.fillOriginal = this.er ? this.er.attr("fill") : null;
            this.borderOriginal = this.br ? this.br.attr("fill") : null;
            this.glowPin = null;
            this.error = false;
            //_PINS_CREATED_[this.id] = this;
            _JSduino_.getPines().push({id: this.id, pin: this});
        }
        
        //FILTROS
        function filtraId(id, idDefault){
            id = (((typeof id) !== undefined) ? (id+"") : idDefault).toUpperCase();
            var pin_def = Pin.getPinDefById(id);
            if(!pin_def) {
                console.log("Pin.filtraId() -> ERROR. No se reconoce el id '" + id + "'");
                return null;
            }
            return pin_def.id;
        }
        /*function filtraFamily(family, familys, familyDefault){
            family = (((typeof family) !== undefined) ? family : familyDefault).toUpperCase();
            familys = familys || UTILS.ObjectUtilities.getKeys(_PIN_FAMILY_);
            if(familys.indexOf(family.toUpperCase()) == -1) {
                console.log("Pin.filtraFamily() -> ERROR. La familia '" + family + "' no se encuentra entre las disponibles [" + familys + "]");
                return null;
            }
            return family;
        }*/
        function filtraMode(mode, modes, modeDefault){
            mode = (((typeof mode) !== undefined) ? mode : modeDefault).toUpperCase();
            modes = modes || _JSduino_.utils.getKeys(_PIN_MODES_);
            if(modes.indexOf(mode.toUpperCase()) == -1) {
                console.log("Pin.filtraMode() -> ERROR. El modo '" + mode + "' no se encuentra entre los disponibles [" + modes + "]");
                return null;
            }
            return mode;
        }

        //PUBLIC API
            //SETTERS
        Pin.prototype.setId = function (id){
            id = filtraId(id);
            if(!id){
                console.log("Pin:: Error al crear el pin [" + id + "]. No puede utilizarse este ID.");
                return null;
            }
            
            this.id = id;
            this.pinDef = Pin.getPinDefById(this.id);
            this.id = this.pinDef.id;
            //OBJETOS RAPHAEL
            this.er = elRaphael;
            if(!this.er){ this.er = _JSduino_.raphael.getPaper().getByDomId("hole_" + this.id); }
            this.br = borderRaphael;
            if(this.er && !this.br){ this.br = _JSduino_.raphael.getPaper().getByDomId("hole_" + this.id + "_border"); }
            this.obj = this.er;
            
            var modes = Pin.getModesById(id);
            mode = filtraMode(this.mode, modes);
            if(!mode){
                if(strict) {
                    console.log("Pin:: Error al crear el pin [" + this.id + "] == '" + this.pinDef.aka + "'. No puede utilizarse el MODO = '" + mode + "'");
                    return null;
                } 
                mode = modes[0];
            }
            this.mode = mode;
            
            this.familys = Pin.getFamilysByIdAndMode(this.id, this.mode);
            
            //INTENTA MANTENER EL MISMO VALOR QUE TENÍA SI SE PUEDE, SINÓ EL VALOR DE ÍNDICE = 0 (TAMBIÉN ACTUALIZA EL ESTADO)
            if(this.setValue(this.value) == null){ this.setValue(this.pinDef.values[0]); }
            return this;
        };
        Pin.prototype.setMode = function (mode){
            var modes = Pin.getModesById(this.id);
            mode = filtraMode(mode, modes);
            if(!mode){
                if(this.strict) { return null; } 
                mode = modes[0];
            }
            this.mode = mode;
            
            this.familys = Pin.getFamilysByIdAndMode(this.id, this.mode);
            return this;
        };
        /*Pin.prototype.setFamily = function (family){
            var familys = this.getFamilysById(this.id);
            family = filtraFamily(family, familys);
            if(!family){
                if(this.strict) { return null; } 
                family = family[0];
            }
            this.family = family;
            return this;
        };*/
        Pin.prototype.setValue = function (value){ 
            //if(this.type == "INPUT") { return this.notify(value); } else { return null; }
            return this.notify(value);
        };
        Pin.prototype.setState = function (state){
            var index = -1;
            state = state || "*";
            if((index = this.pinDef.states.indexOf(state.toUpperCase())) == -1) { return null; }
            return this.setValue(this.pinDef.values[index]);
        };
        
            //GETTERs
        Pin.prototype.getValue = function (){ return this.value; };
        Pin.prototype.getState = function (){ return this.state; };
        Pin.prototype.getPinDef = function (){ return _PINS_DEF_; };
        Pin.prototype.getFamilys = function  (){ return _PIN_FAMILY_; };
        Pin.prototype.getModes = function (){ return _PIN_MODES_; };
        Pin.prototype.getValueByState = function (state){
            var index = -1;
            state = state || "*";
            if((index = this.pinDef.states.indexOf(state.toUpperCase())) == -1) { return null; }
            return this.pinDef.values[index];
        };
        Pin.prototype.getStateByValue = function (value){
            var index = -1;
            value = value || 0;
            if((index = this.pinDef.values.indexOf(value)) == -1) { return null; }
            return this.pinDef.states[index];
        };
        
        //STATIC :: Método estático por comodidad para posibles accesos externos
        //Retorna un pin_definition con igual id o aka. Retorna nulo si no se encuentra.
        Pin.getPinDefById = function (id){
            id = (id + "").toUpperCase();
            id = id.replace("HOLE_", "").replace("CENTER_", "");
            for(var i=0; i<_PINS_DEF_.length; i++){ 
                if((id == _PINS_DEF_[i].id) || (_PINS_DEF_[i].aka.indexOf(id) > -1)){
                    return _PINS_DEF_[i];
                };
            }
            return null;
        };
        /** STATIC :: Retorna un array de claves de familias posibles para ese id o aka. */
        Pin.getFamilysById = function  (id){
            id = (id + "").toUpperCase();
            var familys = [];
            for(var i in _PIN_FAMILY_){
                if(_PIN_FAMILY_.hasOwnProperty(i)){
                    var fam = _PIN_FAMILY_[i]; //array de pinDefs
                    for(var j=0; j < fam.length; j++){
                        if((id == fam[j].id) || (fam[j].aka.indexOf(id) > -1)){
                            familys.push(i);
                        };
                    }
                }
            }
            return familys;
        };
        /**STATIC:: Retorna un array de claves de modos posibles para ese id o aka. */
        Pin.getModesById = function (id){
            id = (id + "").toUpperCase();
            var modes = [];
            for(var i in _PIN_MODES_){
                if(_PIN_MODES_.hasOwnProperty(i)){
                    var mod = _PIN_MODES_[i]; //array de pinDefs
                    for(var j=0, l = mod.length; j < l; j++){
                        //alert(mod[j] + " name=[" + i + "], j=[" + j + "], id=" + mod[j].id + ", aka = [" + mod[j].aka + "]");
                        if((id == mod[j].id) || (mod[j].aka.indexOf(id) > -1)){
                            modes.push(i);
                        }
                    }
                }
            }
            if(modes.length < 1){ console.log("ERROR:: Pin.getModesById:: No existen modos para este ID: " + id); }
            return modes;
        };
        /**STATIC:: Función de utilidad para obtener un array con las familias compatibles con este id y modo.
          * Recorre los arrays genéricos _PIN_MODES_ y _PIN_FAMILY_ buscando encontrar el mismo 'id' (o 'aka') en
          * ambos. */
        Pin.getFamilysByIdAndMode = function (id, mode){
            id = (id + "").toUpperCase();
            var familys = []; //["DIGITAL", "AVR", ..];
            for(var k in _PIN_MODES_){
                if(_PIN_MODES_.hasOwnProperty(k)){
                    var mod = _PIN_MODES_[k]; //array de _PIN_MODES_
                    for(var h=0; h < mod.length; h++){
                        if((id == mod[h].id) || (mod[h].aka.indexOf(id) > -1)){
                            //////
                            for(var i in _PIN_FAMILY_){
                                if(_PIN_FAMILY_.hasOwnProperty(i)){
                                    var fam = _PIN_FAMILY_[i]; //array de _PIN_FAMILY_
                                    for(var j=0; j < fam.length; j++){
                                        if((id == fam[j].id) || (fam[j].aka.indexOf(id) > -1)){
                                            familys.push(i);
                                            break;
                                        }
                                    }
                                }
                            }
                            ///////
                        }
                    }
                }
            }
            /* //MÁS REDUCIDA PERO REALIZA AL FINAL 3 VECES MÁS BUCLES, AUMENTADO LA CARGA DE CÁLCULO
            var modes = Pin.getModesById(id), FAMS = Pin.getFamilysById(id);
            for(var i = 0; i < modes.length; i++){
                var mode = modes[i];
                for(var j = 0; j < FAMS.length; j++){
                    var family = FAMS[j];
                    for(var k = 0; k < _PIN_FAMILY_[family].length; k++){
                        var f = _PIN_FAMILY_[family][k];
                        if((id == f.id) || (f.aka.indexOf(id) > -1)){
                            familys.push(family);
                            break;
                        }
                    }
                }
            }*/
            //REDUCE EL ARRAY FILTRANDO LOS DUPLICADOS
            familys = _JSduino_.utils.unique(familys);
            return familys;
        };
        
        Pin.prototype.highlight = function(onOff){
            if(onOff && !this.glowPin) { this.glowPin = this.er.glow({color: "yellow"}); }
            if(!onOff && this.glowPin) { 
                this.glowPin.remove(); 
                this.glowPin = null;
            }
        }
        Pin.prototype.remove = function (){ 
            //if(this.id in _PINS_CREATED_) { return delete _PINS_CREATED_[this.id]; }
            if(this.er) { this.er.attr({"fill": this.fillOriginal}); }
            if(this.br) { this.br.attr({"fill": this.borderOriginal}); }//this.br.data("fillBorder")}); }
            var ps = _JSduino_.getPines();
            if(ps.indexOf(this)) { ps.splice(_JSduino_.utils.getIndexPinById(this.id), 1); }
            //PODRÍAN BORRARSE TAMBIÉN DEL ARRAY pinModeArray, PERO ENTONCES SE PERDERÍA LA REFERENCIA DEL 'mode' 
            //ESTABLECIDA EN EL SETUP
        }
        
        //PATRÓN OBSERVER
        Pin.prototype.addActuator = function (act){
            if(!act || !(act instanceof _JSduino_.Actuator)) { return null; }
            if(!this.isObserver(act)) { this.actuatorsSuscrite.push(act); }
            act.suscribe(this);
            return this;
        };
        
        Pin.prototype.isObserver = function (act){
            if(!act || !(act instanceof _JSduino_.Actuator)) { return false; }
            return (this.actuatorsSuscrite.indexOf(act) > -1); //act in this.actuatorsSuscrite
        };
        
        Pin.prototype.update = function (value){
            var index = -1;
            if (!this.pinDef) { return null; }
            //alert(this.id + ", value=" + value);
            if((index = this.pinDef.values.indexOf(value)) == -1){
                if ((this.value >= 0) && (this.value <= 1) && (value >= 0) && (value <= 1)) {
                    index = Math.round(value);
                }else {
                    return null;
                }
            }
            this.value = value;
            this.state = this.pinDef.states[index];
            this.color = _COLORS_DEFAULT_[this.state];
            if(this.br) { this.br.attr({"fill": this.color}); } //TODO: Debería actualizarse su estado desde el propio Pin
            return value;
        };
        
        Pin.prototype.notify = function (value){
            var resultado = null;
            if(resultado = this.update(value) !== null) {
                for(var i=0; i<this.actuatorsSuscrite.length; i++){
                    var act = this.actuatorsSuscrite[i];
                    act.update(this.value);
                }
            }
            return resultado;
        };
        Pin.prototype.suscribe = function (act){
            if(!act || !(act instanceof _JSduino_.Actuator)) { return null; }
            if(this.actuatorsSuscrite.indexOf(act) < 0) { 
                this.actuatorsSuscrite.push(act);
                for(var i=0; i<this.actuatorsSuscrite.length; i++){
                    var actuator = this.actuatorsSuscrite[i];
                    actuator.notify(this.value);
                }
                //infoUpdate(this);
                act.suscribe(this);
            }
        };
        Pin.prototype.unSuscribe = function (act){
            if(!act || !(act instanceof _JSduino_.Actuator)) { return null; }
            if(this.actuatorsSuscrite.indexOf(act) > -1) {
                this.actuatorsSuscrite.splice(this.actuatorsSuscrite.indexOf(act), 1);
                for(var i=0; i<this.actuatorsSuscrite.length; i++){
                    var actuator = this.actuatorsSuscrite[i];
                    actuator.notify(this.value);
                }
                //infoUpdate(this);
                act.unSuscribe(this);
            }
        };
        

        return Pin;
    })();
    //END MODULE CLASS: JSduino.Pin
    
    //PUBLIC API
    return _JSduino_;
})({});
//END JSduino WEB-APP