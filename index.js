{
  /**
  * バイオームごとにグラフを分けるclass
  */
  class Biome {
    /**
    * @param {string} canvasElementId canvas要素のid
    * @param {regExp} targetOreRegExp 対象バイオーム特有の鉱石（エメor金）
    */
    constructor (canvasElementId, targetOreRegExp) {
      this.canvas = document.querySelector(`#${canvasElementId}`)
      this.ctx = this.canvas.getContext('2d')
      this.regExp = targetOreRegExp
      this.chart = new Chart(this.ctx, { 
        type: 'line',
        options: {
          scales: { y: { title: { display: true, text: '時給(円)' }}},
          onResize: (chart, size) => {
            chart.options.aspectRatio = size.width < 600 ? 1 : 2
          }
        }
      })
    }

    /**
    * グラフの更新
    * @param {array} calcResults 計算結果
    * @param {array} ranks ランク一覧（横軸）
    */
    updateChart (calcResults, ranks) {
      const filteredCalcResults = calcResults.filter(calcResult => this.regExp.test(calcResult.name))
      this.chart.data.labels = ranks.map(rank => rank.ランク名)
      this.chart.data.datasets = filteredCalcResults.map(calcResult => {
        return {
          label: calcResult.name,
          data: calcResult.wages
        }
      })

      // ネザーのデータ追加（固定値）
      this.chart.data.datasets.push({
        label: 'ネザー',
        data: new Array(ranks.length).fill(57432)
      })
      
      this.chart.update('none')
    }
  }

  /**
  * .jsonをfetchしてobject化
  * @param {string} url .jsonのURL
  * @return {promise} fetchのPromise
  */
  const fetchJSON = (url) => {
    return fetch(url).then(response => response.json())
  }

  /**
  * objectをtableに表示
  * @param {array} dataArr 表示するデータ（objectの配列）
  * @param {string} tableElementId table要素のid属性
  */
  const JSONToTable = (dataArr, tableElementId) => {
    const keys = Object.keys(dataArr[0])

    const tableElement = document.querySelector(`#${tableElementId}`)
    const thead = tableElement.createTHead()
    const tbody = tableElement.createTBody()

    thead.innerHTML += `<tr>${keys.map(key => '<th>' + key + '</th>').join('')}</tr>`
    tbody.classList.add('table-group-divider')
    for (const data of dataArr) {
      // 数値のみ編集可能にする
      const tds = keys.map(key => {
        if (isNaN(Number(data[key]))) {
          return '<td>' + data[key] + '</td>'
        } else {
          return '<td contenteditable="true">' + data[key] + '</td>'
        }
      })
      tbody.innerHTML += `<tr>${tds.join('')}</tr>`
    }
  }

  /**
  * tableをobject化
  * @param {string} tableElementId table要素のid属性
  * @return {array} tableの内容（objectの配列）
  */
  const tableToJSON = (tableElementId) => {
    const tableElement = document.querySelector(`#${tableElementId}`)

    const colNames = Array.from(tableElement.querySelectorAll('th')).map(th => th.innerHTML)
    const rows = Array.from(tableElement.querySelectorAll('tbody tr'))

    return rows.map(row => {
      const cells = Array.from(row.querySelectorAll('td'))
      return Object.fromEntries(cells.map((cell, index) => {
        const numValue = Number(cell.innerHTML)
        return [colNames[index], isNaN(numValue) ? cell.innerHTML : numValue]
      }))
    })
  }

  /**
  * 単価表から価格を取り出す
  * @param {array} prices 価格データ（objectの配列）
  * @param {string} itemName 価格を調べるアイテム名（日本語で）
  * @return {number} 価格
  */
  const getPrice = (prices, itemName) => {
    return prices.find(price => price.アイテム名 === itemName).単価
  }

  /**
  * ランクごとの時給を計算
  */
  const calculate = () => {
    const mineData = tableToJSON('mineData')
    const prices = tableToJSON('price')
    const ranks = tableToJSON('rank')

    const calcResults = []
    for (const data of mineData) {
      const calcResult = {
        name: data.採掘タイプ,
        wages: []
      }
      for (const rank of ranks) {
        const jewel = data.石採掘数 * rank.期待値 | 0
        const gold = data.金原石ブロック * getPrice(prices, '金原石ブロック') | 0
        const coal = data.石炭ブロック * getPrice(prices, '石炭ブロック') | 0
        const copper = data.銅原石ブロック * getPrice(prices, '銅原石ブロック') | 0
        const emerald = data.エメラルド * getPrice(prices, 'エメラルド') | 0
        const iron = data.鉄原石ブロック * getPrice(prices, '鉄原石ブロック') | 0
        const cost = data.消費耐久 / 14 * getPrice(prices, 'エンチャントのビン') | 0 + 2000
        calcResult.wages.push(jewel + gold + coal + copper + emerald + iron - cost)
      }
      calcResults.push(calcResult)
    }

    updateCalcResultTable(calcResults, ranks)
    updateChart(calcResults, ranks)
  }

  /**
  * 計算結果表の更新
  * @param {array} calcResults 時給の計算結果
  * @param {array} ranks ランク名
  */
  updateCalcResultTable = (calcResults, ranks) => {
    const tableElement = document.querySelector('#calcResult')
    const thead = tableElement.createTHead()
    const tbody = tableElement.tBodies.length > 0 ? tableElement.tBodies[0] : tableElement.createTBody()

    thead.innerHTML = `<tr><th></th>${ranks.map(rank => '<th>' + rank.ランク名 + '</th>').join('')}</tr>`

    tbody.classList.add('table-group-divider')
    tbody.innerHTML = ''
    for (calcResult of calcResults) {
      tbody.innerHTML += `<tr><td>${calcResult.name}</td>${calcResult.wages.map(wage => '<td>' + wage + '</td>').join('')}</tr>`
    }
  }

  /**
  * グラフ更新
  * @param {array} calcResults 時給の計算結果
  * @param {array} ranks ランク名
  */
  const updateChart = (calcResults, ranks) => {
    mountains.updateChart(calcResults, ranks)
    badlands.updateChart(calcResults, ranks)
  }

  /**
  * 初期化
  */
  const mountains = new Biome('mountains', /エメ/)
  const badlands = new Biome('badlands', /金/)

  const main = async function () {
    const urls = ['mineData.json', 'price.json', 'rank.json']
    await Promise.all(urls.map(fetchJSON)).then((fetchResults) => {
      JSONToTable(fetchResults[0], 'mineData')
      JSONToTable(fetchResults[1], 'price')
      JSONToTable(fetchResults[2], 'rank')
    })

    calculate()
    document.addEventListener('input', calculate)
  } ()
}
