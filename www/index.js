$(function () {
    Date.prototype.toYMD = Date_toYMD;

    /**
     * @return {string}
     */
    function Date_toYMD() {
        let year, month, day;
        year = String(this.getFullYear());
        month = String(this.getMonth() + 1);
        if (month.length === 1) {
            month = "0" + month;
        }
        day = String(this.getDate());
        if (day.length === 1) {
            day = "0" + day;
        }
        return year + "-" + month + "-" + day;
    }

    let today = new Date().toUTCString();
    $('#title').html('COVID-19 Statistics as of ' + today);

    window.setInterval(function () {
        today = new Date().toUTCString();
        $('#title').html('COVID-19 Statistics as of ' + today);
    }, 1000);

    const contextWorldwide = document.getElementById('worldwide-chart').getContext('2d');
    const contextOutlook = document.getElementById('outlook-chart').getContext('2d');
    const worldWideChart = new Chart(contextWorldwide, {
        type: 'line',
        data: getWorldwideChartData(null),
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                xAxes: [{
                    gridLines: {
                        display: false
                    },
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 8
                    }
                }],
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }]
            }
        }
    });
    const outlookChart = new Chart(contextOutlook, {
        type: 'line',
        data: {
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            legend: {
                display: false
            },
            scales: {
                xAxes: [{
                    type: 'linear',
                    display: false,
                    gridLines: {
                        display: false
                    }
                }],
                yAxes: [{
                    gridLines: {
                        display: false
                    },
                }]
            }
        }
    });

    $('#countries_table').DataTable({
        "ajax": {
            "url": "/countries/today",
            "dataSrc": ""
        },
        "order": [[1, "desc"]],
        "columns": [
            {"data": "country"},
            {"data": "cases"},
            {"data": "todayCases"},
            {"data": "deaths"},
            {"data": "todayDeaths"},
            {"data": "recovered"},
            {"data": "active"},
            {"data": "critical"},
            {"data": "casesPerOneMillion"}
        ]
    });

    $.ajax({
        url: "/worldwide/today",
        success: function (result) {
            const active = result.cases - (result.deaths + result.recovered)
            $("#today-cases").html(numberWithCommas(result.cases));
            $("#today-active").html(numberWithCommas(active));
            $("#today-deaths").html(numberWithCommas(result.deaths));
            $("#today-recovered").html(numberWithCommas(result.recovered));
            $("#today-active-percentage").html('(' + (active / result.cases * 100).toFixed(1) + '%)');
            $("#today-deaths-percentage").html('(' + (result.deaths / result.cases * 100).toFixed(1) + '%)');
            $("#today-recovered-percentage").html('(' + (result.recovered / result.cases * 100).toFixed(1) + '%)');
        }
    });

    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    $.ajax({
        url: "/worldwide",
        success: function (result) {
            const chartData = getWorldwideChartData(result);
            worldWideChart.data.labels.push(...chartData.data.labels);
            worldWideChart.data.datasets.push(...chartData.data.datasets);
            worldWideChart.update();
        }
    });

    $.ajax({
        url: "/worldwide/predictions",
        success: function (result) {
            getTodayExpectedCases(result);
        }
    });

    function getTodayExpectedCases(result) {
        $('#today-actual-cases').html(numberWithCommas(result.actualCasesValue));
        $('#today-actual-cases-percentage').html('(+' + result.actualCasesGrowth + '%)');
        if (result.actualCasesValue > result.expectedCases) {
            $('#today-actual-cases').addClass('negative');
            $('#today-actual-cases-percentage').addClass('negative');
        } else {
            $('#today-actual-cases').addClass('positive');
            $('#today-actual-cases-percentage').addClass('positive');
        }
        if (result.expectedCasesGrowth > 0) {
            $('#today-expected-cases').html(numberWithCommas(result.expectedCases));
            if (result.expectedCasesGrowth > 0.0 && result.expectedCasesGrowth < 5.0) {
                $('#today-expected-cases').addClass('neutral');
                $('#today-expected-cases-percentage').addClass('neutral');
            } else if (result.expectedCasesGrowth >= 5.0) {
                $('#today-expected-cases').addClass('negative');
                $('#today-expected-cases-percentage').addClass('negative');
            }
            $('#today-expected-cases-percentage').html('(+' + result.expectedCasesGrowth + '%)');
        } else {
            $('#today-expected-cases').html(result.lastCasesValue);
            $('#today-expected-cases-percentage').html('(0%)');
            $('#today-expected-cases').addClass('positive');
            $('#today-expected-cases-percentage').addClass('positive');
        }
        if (result.outlookValue > 0.9 && result.outlookValue < 1.1) {
            $('#today-outlook').html('NEUTRAL');
            $('#today-outlook').addClass('neutral');
            $('#today-outlook-value').addClass('neutral');
        } else if (result.outlookValue >= 1.1) {
            $('#today-outlook').html('INCREASING');
            $('#today-outlook').addClass('negative');
            $('#today-outlook-value').addClass('negative');
        } else if (result.outlookValue <= 0.9) {
            $('#today-outlook').html('DECREASING');
            $('#today-outlook').addClass('positive');
            $('#today-outlook-value').addClass('positive');
        }
        $('#today-outlook-value').html('(' + (result.outlookValue >= 0 ? '+' : '') + result.outlookValue + ')');

        outlookChart.data.datasets.push({
            label: 'Outlook',
            data: result.outLookArray,
            fill: false,
            borderColor: [
                'rgb(82,200,255)',
            ],
            borderWidth: 2
        });
        outlookChart.update();
    }

    function getWorldwideChartData(data) {
        let chartData;
        if (!data) {
            chartData = {
                data: {
                    labels: [],
                    datasets: []
                }
            };

        } else {
            chartData = {
                data: {
                    labels: data.map((d) => new Date(d.created).toYMD()),
                    datasets: [{
                        label: 'Total Cases',
                        data: data.map((d) => d.cases),
                        backgroundColor: [
                            'rgba(255,177,0,0.41)'
                        ],
                        borderColor: [
                            'rgb(255,249,146)',
                        ],
                        borderWidth: 1
                    }, {
                        label: 'Total Deaths',
                        data: data.map((d) => d.deaths),
                        backgroundColor: [
                            'rgba(255,24,1,0.4)'
                        ],
                        borderColor: [
                            'rgb(255,91,82)',
                        ],
                        borderWidth: 1
                    }, {
                        label: 'Total Recovered',
                        data: data.map((d) => d.recovered),
                        backgroundColor: [
                            'rgba(57,255,0,0.4)'
                        ],
                        borderColor: [
                            'rgb(141,255,102)',
                        ],
                        borderWidth: 1
                    }]
                }
            };
        }
        return chartData;
    }
});
