// const ctx = document.getElementById('varianceChart');

// new Chart(ctx, {
//     type: 'line',
//     data: {
//         labels: ['#1', '#2'],
//         datasets: [{
//             label: 'Variance %',
//             data: [2.24, 12.47],

//             borderColor: '#f5a623',     
//             backgroundColor: 'rgba(245,166,35,0.25)',

//             pointBackgroundColor: '#f5a623',
//             pointBorderColor: '#f5a623',

//             fill: true,
//             tension: 0
//         }]
//     },
//     options: {
//         responsive: true,
//         maintainAspectRatio: false,

//         plugins: {
//             legend: {
//                 display: false
//             }
//         },

//         scales: {
//             y: {
//                 min: 0,
//                 max: 20,

//                 ticks: {
//                     color: '#bdbdbd',
//                     callback: value => value + '%'
//                 },

//                 grid: {
//                     color: 'rgba(255,255,255,0.1)'
//                 }
//             },

//             x: {
//                 ticks: {
//                     color: '#bdbdbd'
//                 },

//                 grid: {
//                     color: 'rgba(255,255,255,0.05)'
//                 }
//             }
//         }
//     }
// });
const API_URL = "http://localhost:5000";

let chart = null;


// LOAD DATA FROM BACKEND

async function loadDashboard() {

    try {

        const response = await fetch(
            `${API_URL}/dashboard`
        );

        const batches = await response.json();

        renderKpis(batches);
        renderLedger(batches);
        renderChart(batches);

    }

    catch(error){

        console.log(
            "Backend error:",
            error
        );

    }

}



// KPI CARDS

function renderKpis(batches){

const totalImpressions =
batches.reduce(
(sum,b)=>
sum+b.advertiserCount+b.publisherCount,
0
);

const cleanImpressions =
batches
.filter(
b=>b.status!=="Disputed"
)
.reduce(
(sum,b)=>sum+b.advertiserCount,
0
);

const activeDisputes =
batches.filter(
b=>b.status==="Disputed"
).length;

const cpm=4.2;

const adSpend =
(totalImpressions/1000)*cpm;

const clawback=
batches
.filter(
b=>b.status==="Disputed"
)
.reduce(
(sum,b)=>
sum+
(b.publisherCount/1000)
*cpm*
(b.penaltyBasisPoints/10000),
0
);


document.getElementById(
"adSpent"
).innerText=
"$"+adSpend.toFixed(2);

document.getElementById(
"verified"
).innerText=
cleanImpressions;

document.getElementById(
"clawback"
).innerText=
"$"+clawback.toFixed(2);

document.getElementById(
"disputes"
).innerText=
activeDisputes;

}



// LEDGER

function renderLedger(batches){

const tbody =
document.getElementById(
"ledger-body"
);

if(!tbody) return;

tbody.innerHTML="";

batches.forEach(b=>{

tbody.innerHTML += `

<tr>

<td>#${b.batchId}</td>

<td>Campaign ${b.campaignId}</td>

<td class="${
b.status==="Verified"
?
"verified-text"
:
"disputed-text"
}">
${b.variancePct.toFixed(2)}%
</td>

<td>
<span class="${
b.status==="Verified"
?
"verified"
:
"disputed"
}">
${b.status}
</span>
</td>

</tr>

`;

});

}



// CHART

function renderChart(batches){

const canvas =
document.getElementById(
"varianceChart"
);

if(!canvas) return;

const ctx =
canvas.getContext(
"2d"
);

if(chart){
chart.destroy();
}

chart = new Chart(ctx, {

type:"line",

data:{

labels:
batches.map(
b=>"#"+b.batchId
),

datasets:[{

label:"Variance %",

data:
batches.map(
b=>Number(b.variancePct)
),

borderColor:"#f5a623",

backgroundColor:
"rgba(245,166,35,0.25)",

fill:true,

tension:0.4

}]

},

options:{

responsive:true,

maintainAspectRatio:false

}

});

}



// START

loadDashboard();

setInterval(
loadDashboard,
8000
);
document
.getElementById(
"generateBatch"
)
.addEventListener(
"click",
generateBatch
);

async function generateBatch(){

try{

await fetch(

"http://localhost:5000/generateBatch",

{

method:"POST"

}

);

loadDashboard();

}

catch(err){

console.log(err);

}

}