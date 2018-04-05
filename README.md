JSduino v0.1.0
by GuerraTron  
2018 - <dinertron@gmail.com>

![JSduino-logo](./JSduino-logo.png)

## INTRO: ##

*'JSduino web-app' is a great Arduino simulator in JS.*

This web application allows you to try virtually Arduino projects saving the assembly and the benefits of immediacy that allows us to 'javascript'. In a matter of minutes we can visualize how our real prototype would behave before starting the assembly, offering us an idea of how to undertake it in the best way and what functions we would need to implement.

This application is aimed at developers who are more comfortable (*like myself*) implementing javascript solutions. JS is much more flexible and easy to use than 'C' (*my opinion*) and, although it is not the same, similar results can be expected in the face of development challenges.

The drawback is that Arduino is programmed in 'C', and for a 'javascript programmer' it can cost a lot to find a direct solution in this language. That is where it can be advantageous (*for me it has been*) to use a **tests intermediary** . Once we find the behavior sought through 'javascript' it is not that difficult *'transpilation'* to 'C' as it would have been coding it directly in this language.  
>Some programmers can save many hours of code.

### DESCRIPTION: ###

JSduino - ARDUINO SIMULATOR in JS.

JSduino is a web-app written in '*JavaScript*' that emulates an arduino board (*UNO R3*) with the representation of its input and output pins, and the possibility of inserting buttons that act on those pins. These buttons are actuators that can behave like Switches, NO pushbuttons, NC pushbuttons, push-switches, ... or also receivers such as LEDs and sensors.

In the app you can select devices that act on the different pins of the board to see in real time the different states of the pins depending on the code entered and the actions on those actuators.

The *UNO* board shown is **interactive**, it seems real, allowing to act on each pin individually, see its status, the internal LEDs and even the *reset* button reacts to user events.

### TARGET: ###

The objective of this application is a previous step to the construction of a real prototype with arduino, working in a *virtual* way, saving assembly time on the board.  
This project does not implement all the Arduino functions in full, nor does it support add-ons. This application became a quick evaluation and behaved like the *UNO R3* board in front of simple programming challenges.

It is not intended for productive products, rather as a testing tool to help in the first steps of the development of a project *real Arduino*; before implementing it physically on a board, can help us to debug the algorithm to be used, visualizing the responses of this through the inputs and outputs in virtual devices (buttons, push buttons, LEDs, etc.), without having to wire anything .

### INTERFACE: ###

The *UI* represents a board '**Arduino UNO R3**' interactive, and around it a series of zones:

  - Devices Area: Represents the devices available for use, each of them has different characteristics can be input or output, and admitting analog or digital values: *Switch, NO pushbutton, NC pushbutton, Sensor, LEDs, Display*. One of them must be selected before clicking on the desired pin.
  
  - Actuators Area: Both actuators and receivers, represents the devices attacking pins that will be used in our circuit. They are interactive and allow their manipulation both with user actions and programmatically through the code.

  - Buttons Area: It houses the different actions allowed on the board. From the execution of the code to the saving of the current states and objects in the session. *Run / Pause, ReLoad State, Save, Delete, View State, and the code buttons*.

  - Console Area: Represents a simulation of what the **Monitor** would be in *Arduino*. It is handled through messages sent from the code itself through the object *'Serial'*.

  - Messages Area: This zone has been implemented for possible extensions, at the moment it is not used.

The code buttons allow access to the three separate areas: *Global, Setup and Loop*. We are talking about code, OF COURSE, written in the '**javascript**' valid language.  
In the Global area, the code would be introduced outside the *setup() and loop()* functions of the **Arduino IDE**, both variable definition and user functions.

Due to the nature **JS**, there are sensible modifications with respect to the code that we would write in language **C**. All global variables to be defined must be treated as properties of a global object called **'V'**, so that to define a variable as *'var pin02 = 2;'* must be implemented as *'V.pin02 = 2;'*, but it will be treated as local.

Custom or user functions will be immediately available in any code area (*Global, Setup or Loop*) without relying on the global object **'V'**, although they could also be defined as methods of this object.

The main functions of the *IDE Arduino* have been implemented: *pinMode, digitalRead, digitalWrite, analogRead*, ... and even the part of the object *'Serial'* that communicates with the console monitor.

#### TO CONSIDER: ####

This is an approximation to the behavior of the code on an *Arduino* real board, it does not mean that it is exactly the same, but it can offer us a very approximate idea.

**ATTENTION**: The *'delay (..)'* function is advised **not to use** as much as possible, since what it does is *'freeze the execution of the JS engine'*. This is due to the nature of Javascript itself as a language that is not *multi-threaded*, where it does not make sense to stop the engine since it can cause the whole *UI* to stop during a time-lapse, preventing the system response in User actions such as pressing a button.  
You have to look for alternatives to pause the code, in such a way that a BLINK example commonly written as:

<code>
//TRADITIONAL BLINK:  
digitalWrite(5, "LOW");  
delay(2000);  
digitalWrite(5, "HIGH");  
delay(2000);
</code>

could be implemented as:

<code>
//BLINK ALTERNATIVE:  
V.on = !V.on;  
digitalWrite(5, V.on ? HIGH : LOW);  
delay(2000);
</code>

### UTILIZATION: ###
  In addition to loading the **JSduino API** using its corresponding label in the 'head' of the page:  

    <script type="text/javascript" src="API/JSduino.js"></script>
    
This script is self-sufficient and will be responsible for building the entire interface and loading the necessary external scripts such as: the *'Raphael-JS' library*, *acorn.js*, *escodegen.js* and *edit_area.js* among others. It will also load the styles, and will establish effects and events on the board and action buttons.

It can then be initialized using a 'script' tag (obviously the container must be defined):

    <script type="text/javascript">
        //JSduino INITIALIZATION:
        JSduino.init(document.getElementById("containerSVG"));
    </script>
    
The initialization '**init (..)**' method supports up to three parameters: the container element, an object with the board size options and an object of devices to use. An example of these parameters could be:

   - Container: [DOMElement]

        document.getElementById("containerSVG")

   - Size: [Object JS]

        {width: 555/2, height:432/2, viewBox: {x:0, y:0, w:212, h:162}}

   - objActuators: [Object json] Represents a devices state with which to start working, eg.:

        {"INPUT":{"id":"buttonsInput", "caption":"INPUTS:<br />", "className":"actuators input", "list":[{"type":"switcher","mode":"INPUT","family":"ANALOG","id":"A0","value":1,"className":"actuator"}, {"type":"switcher","mode":"INPUT","family":"DIGITAL","id":"6","value":0,"className":"actuator"}, {"type":"switcher","mode":"INPUT","family":"ANALOG","id":"A3","value":0,"className":"actuator"}]}, "OUTPUT":{"id":"buttonsOutput","caption":"OUTPUTS:<br />", "className":"switches output", "list":[{"type":"ledBlue","mode":"OUTPUT","family":"DIGITAL","id":"8","value":1,"className":"actuator"}, {"type":"switcher","mode":"OUTPUT","family":"DIGITAL","id":"5","value":0,"className":"actuator"}]}}

The **JSduino API** is responsible for generating the entire HTML structure and loading the styles, as well as assigning the js behavior for the entire interface.
It is interesting to note that the plate is represented with an *SVG* image generated *'on the fly'* by means of the **Raphael-JS script** , which gives it the necessary dynamism and interactivity.

>"To see the HTML structure generated by this application you can see the file '**struct.html**' "

##### ACKNOWLEDGMENT AND GRATEFULNESS: #####
Thanks to the author of the *'Raphael-JS'* library, a great library for handling and effects in *SVG* images.
Internally contains other dependencies for the parsing and highlighting of the code such as: *'acorn, escodegen and edit-area'*, many thanks to the authors of these great libraries.
