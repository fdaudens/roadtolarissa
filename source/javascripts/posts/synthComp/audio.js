 
var ac = this.AudioContext ? new AudioContext() : new webkitAudioContext();
ac.createGain();
var totalBeats =  0;
var beatFraction = 0;

var lastAcTime = ac.currentTime;
var lastApplyBeat = 0;
d3.timer(function(){
  var beatDuration = (1/getHz())/numBeats;
  beatFraction += (ac.currentTime -lastAcTime)/((1/getHz())/numBeats);
  lastAcTime = ac.currentTime;
  var lastAngle = 360/numBeats*(totalBeats + beatFraction);

  d3.selectAll(".gearG").attr("transform", function(d){
    return "rotate(" + lastAngle  * d.direction + ")"; });

  //ac time is more accurate than setInterval, look ahead 100 ms to schedule notes
  while (beatFraction > .9 && !isPaused){  
    
    //on every nth beat apply notes  
    if (!(totalBeats % offset)){

      //extract update information
      var updateArray = pitches.map(function(d){ return false; });

      beatsB.filter(function(d, i){ return i === (5 + totalBeats/offset) % numBeatsB; })
        .selectAll('path')
          .each(function(d, i){
            updateArray[i] = d.on;
            //TODO flash color
            d3.select(this)
                .style('fill', d.on ? '#4A84CF' : '#AEE0FF')
                .style('fill-opacity', 1)
              .transition().duration(2000)
                .call(colorNote);
          });

      //apply updates to fast circle
      beats.filter(function(d, i){ return i == lastApplyBeat; })
        .selectAll('path')
          .each(function(d, i){
            if (updateArray[i]){
              d.on = +!d.on;
              d3.select(this)
                  .style('fill', d.on ? '#6AC342' : '#CE3101')
                  .style('fill-opacity', 1)
                .transition().duration(1000).delay(250)
                  .call(colorNote);
            }
          })

      lastApplyBeat = (lastApplyBeat + 1) % numBeats;
    }

    //grab the active beat column 
    beats.filter(function(d, i){ return i == totalBeats % numBeats; })
      .selectAll('path')
        .each(function(d){
          //if the note is selected, play pitch at scheduled nextBeat
          if (d.on){
            var o = osc(d.pitch, d.on);
            var nextBeatTime = ac.currentTime// TODO set to correct time + (1 - 0);
            o.osc.start(nextBeatTime);
            o.osc.stop(nextBeatTime + getDuration())
          }

          //highlight and unhighlight selected column
          //visually exact timing doesn't matter as much
          //easier to hear something off by a few ms
          var selection = d3.select(this);
          selection
            .style('opacity', 1)
            .style('fill', 'black')
                .style('fill-opacity', '.7')
              .transition().duration(getHz()*1000*2)
                .style('opacity', '.7')
                .call(colorNote);

          //use timeout instead of transition so mouseovers transitions don't cancel)
          setTimeout(function(){
            selection
                //.style('opacity', '.7')
                .call(colorNote)
          }, getHz()*1000000)
        });

    totalBeats++;
    beatFraction--;
  }
});


//add sliders to the page
var sliders = d3.select('#synthSliders').selectAll('input')
    .data(['Pitch', 'BPM', 'Duration']).enter()
  .append('div')
    .style({display: 'inline-block', 'margin-left': '89.5px', 'text-align': 'center'})

sliders.append('p').text(f());

sliders.append('p').append('input')
    .attr({type: 'range', min: '0', max: '1', step: '0.0001', value: '.5'})
    .attr('id', f())
    .style('width', '127px');

//use inverse log scales for finer control over high and low values 
function getPitch(){
  var scale = d3.scale.log().base(2).domain([.1, 10]);
  return scale.invert((d3.select('#Pitch').node().valueAsNumber));
}
function getHz(){
  var scale = d3.scale.log().base(2).domain([.01, 5]);
  var rv = scale.invert((d3.select('#BPM').node().valueAsNumber));
  return rv;
}
function getDuration(){
  var scale = d3.scale.log().base(2).domain([.05, 1]);
  return scale.invert((d3.select('#Duration').node().valueAsNumber));
}

//generate oscillator
function osc(pitch, waveform){
  oscillator = ac.createOscillator(),
  oscillator.type = 1;
  oscillator.frequency.value = pitch*getPitch();
  gainNode = ac.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(ac.destination);
  gainNode.gain.value = .04;
  return {osc: oscillator, gain: gainNode};
};


var isPaused = false;
var pauseStart = 0;
var totalPause = 0;
function togglePause(){
  isPaused = !isPaused;
  if (isPaused){
    pauseStart = ac.currentTime;
  } else {
    totalPause += ac.currentTime - pauseStart;
  }

}

function clear(){
  d3.selectAll('.note').each(function(d){
    if (d.on){
      d3.select(this).on('click').call(this, d);
    }
  });
}

function randomize(){
  clear();
  d3.selectAll('.note').each(function(d){
    if (Math.random() > .3){
      d3.select(this).on('click').call(this, d);
    }
  });
}

d3.select('#buttons').selectAll('.button')
    .data(
      [ {text: 'Play/Pause',  fun: togglePause},
        {text: 'Clear',       fun: clear},
        {text: 'Randomize',   fun: randomize}]).enter()
    .append('span')
      .text(f('text'))
      .on('click', function(d){ d.fun(); });

clear();
randomize();


function toURL(){
  return d3.selectAll('.note').data().map(function(d){
    return d.on ? '1' : '0'; }).join('');
}